import React from 'react';
import type { AppState, BadgeDefinition, ID, LogEntry, Quest, Settings, Student, Team } from '~/types/models';
import { normalizeThemeId } from '~/types/models';
import { DEFAULT_SETTINGS } from '~/core/config';
import { AVATAR_STAGE_COUNT, sanitizeAvatarStageThresholds } from '~/core/avatarStages';
import { ASSETS_ENABLED } from '~/config';
import { createStorageAdapter } from '~/services/storage';
import { levelFromXP } from '~/core/xp';
import { addQuest, addStudent, awardQuest, createInitialState, setQuestActive } from '~/core/state';
import { sanitizeState } from '~/core/schema/appState';
import { migrateState } from '~/core/schema/migrate';
import { computeClassProgress, normalizeClassMilestoneStep } from '~/core/classProgress';
import { setEffectsSettings } from '~/utils/effects';
import { SOUND_KEYS, type SoundKey, type SoundOverride, type SoundOverrides } from '~/audio/types';
import { normalizeAudioFormat } from '~/audio/format';

type AwardPayload = { questId: ID; studentId?: ID; teamId?: ID; note?: string };

type Action =
  | { type: 'INIT'; state: AppState }
  | { type: 'ADD_STUDENT'; alias: string }
  | { type: 'UPDATE_STUDENT_ALIAS'; id: ID; alias: string }
  | { type: 'UPDATE_STUDENT_AVATAR'; id: ID; updates: Partial<Pick<Student, 'avatarMode' | 'avatarPack'>> }
  | { type: 'REMOVE_STUDENT'; id: ID }
  | { type: 'ADD_STUDENTS_BULK'; aliases: string[] }
  | { type: 'REMOVE_STUDENTS_BULK'; ids: ID[] }
  | { type: 'ADD_QUEST'; quest: Quest }
  | {
      type: 'UPDATE_QUEST';
      id: ID;
      updates: Partial<Pick<Quest, 'name' | 'xp' | 'type' | 'active' | 'category' | 'categoryId'>>;
    }
  | { type: 'REMOVE_QUEST'; id: ID }
  | { type: 'TOGGLE_QUEST'; id: ID }
  | { type: 'ADD_BADGE_DEF'; definition: BadgeDefinition }
  | { type: 'REMOVE_BADGE_DEF'; id: ID }
  | { type: 'AWARD_BADGE_MANUAL'; studentId: ID; badgeId: ID }
  | { type: 'CATEGORY_CREATE'; name: string }
  | { type: 'CATEGORY_DELETE'; id: ID }
  | { type: 'AWARD'; payload: AwardPayload }
  | { type: 'UNDO_LAST' }
  | { type: 'RESET_SEASON' }
  | { type: 'ADD_GROUP'; name: string }
  | { type: 'REMOVE_GROUP'; id: ID }
  | { type: 'RENAME_GROUP'; id: ID; name: string }
  | { type: 'SET_GROUP_MEMBERS'; id: ID; memberIds: ID[] }
  | { type: 'UPDATE_SETTINGS'; updates: Partial<AppState['settings']> }
  | { type: 'IMPORT'; json: string };

const createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

const unique = <T,>(values: Iterable<T>) => Array.from(new Set(values));

const SOUND_KEY_SET = new Set<SoundKey>(SOUND_KEYS);

const sanitizeSoundOverrides = (
  input?: SoundOverrides | Record<string, unknown> | null,
): SoundOverrides => {
  if (!input) {
    return {};
  }

  const entries = Object.entries(input)
    .map(([key, value]) => {
      if (!SOUND_KEY_SET.has(key as SoundKey)) {
        return null;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) {
          return null;
        }
        return [key as SoundKey, { source: trimmed } satisfies SoundOverride];
      }

      if (value && typeof value === 'object') {
        const source =
          typeof (value as { source?: unknown }).source === 'string'
            ? (value as { source?: string }).source.trim()
            : '';
        if (!source) {
          return null;
        }
        const rawFormat = (value as { format?: unknown }).format;
        const normalizedFormat = normalizeAudioFormat(
          typeof rawFormat === 'string' || Array.isArray(rawFormat) ? rawFormat : undefined,
        );
        if (normalizedFormat) {
          return [key as SoundKey, { source, format: normalizedFormat } satisfies SoundOverride];
        }
        return [key as SoundKey, { source } satisfies SoundOverride];
      }

      return null;
    })
    .filter((entry): entry is [SoundKey, SoundOverride] => Boolean(entry));

  if (!entries.length) {
    return {};
  }

  return Object.fromEntries(entries) as SoundOverrides;
};

const normalizeAvatarPack = (pack?: Student['avatarPack']): NonNullable<Student['avatarPack']> => {
  const rawKeys = Array.isArray(pack?.stageKeys) ? pack?.stageKeys ?? [] : [];
  const stageKeys = Array.from({ length: AVATAR_STAGE_COUNT }, (_, index) => {
    const candidate = rawKeys[index];
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  });
  return { stageKeys };
};

const stageKeysEqual = (a: (string | null)[], b: (string | null)[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const normalizeStudentAvatar = (student: Student): Student => {
  const avatarMode: Student['avatarMode'] = student.avatarMode === 'imagePack' ? 'imagePack' : 'procedural';
  const currentPack = normalizeAvatarPack(student.avatarPack);
  const needsPackUpdate = !student.avatarPack || !stageKeysEqual(student.avatarPack.stageKeys ?? [], currentPack.stageKeys);
  const needsModeUpdate = student.avatarMode !== avatarMode;
  if (!needsPackUpdate && !needsModeUpdate) {
    return student.avatarPack ? student : { ...student, avatarPack: currentPack };
  }
  return {
    ...student,
    avatarMode,
    avatarPack: currentPack,
  } satisfies Student;
};

function normalizeSettings(settings?: Partial<Settings>): Settings {
  const { flags, soundOverrides, ...rest } = settings ?? {};
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...rest,
    soundOverrides: sanitizeSoundOverrides({
      ...(DEFAULT_SETTINGS.soundOverrides ?? {}),
      ...(soundOverrides ?? {}),
    }),
    flags: {
      ...(DEFAULT_SETTINGS.flags ?? {}),
      ...((flags ?? {}) as Record<string, boolean>),
    },
  };
  merged.theme = normalizeThemeId(merged.theme ?? DEFAULT_SETTINGS.theme, DEFAULT_SETTINGS.theme);
  merged.avatarStageThresholds = sanitizeAvatarStageThresholds(merged.avatarStageThresholds);
  const rawStarKey =
    typeof merged.classStarIconKey === 'string' ? merged.classStarIconKey.trim() : merged.classStarIconKey;
  merged.classStarIconKey = rawStarKey && typeof rawStarKey === 'string' && rawStarKey.length > 0 ? rawStarKey : null;
  merged.classMilestoneStep = normalizeClassMilestoneStep(merged.classMilestoneStep);
  const starsName =
    typeof merged.classStarsName === 'string' && merged.classStarsName.trim().length > 0
      ? merged.classStarsName.trim()
      : DEFAULT_SETTINGS.classStarsName;
  merged.classStarsName = starsName;
  if (!merged.soundOverrides || Object.keys(merged.soundOverrides).length === 0) {
    merged.soundOverrides = {};
  }
  if (merged.onboardingCompleted == null) {
    merged.onboardingCompleted = false;
  }
  return merged;
}

function sortLogs(logs: LogEntry[]): LogEntry[] {
  return [...logs].sort((a, b) => b.timestamp - a.timestamp);
}

function normalizeTeams(rawTeams: Team[] | undefined, students: Student[]): Team[] {
  if (!rawTeams?.length) {
    return [];
  }
  const knownStudentIds = new Set(students.map((student) => student.id));
  return rawTeams.map((team) => {
    const safeMembers = unique((team.memberIds ?? []).filter((id) => knownStudentIds.has(id)));
    return {
      id: team.id,
      name: team.name?.trim() || 'Gruppe',
      memberIds: safeMembers,
    } satisfies Team;
  });
}

function syncStudentsWithTeams(students: Student[], teams: Team[]): Student[] {
  if (!teams.length) {
    let changed = false;
    const normalized = students.map((student) => {
      if (student.teamId == null) {
        return student;
      }
      changed = true;
      return { ...student, teamId: undefined };
    });
    return changed ? normalized : students;
  }

  const membership = new Map<ID, ID>();
  teams.forEach((team) => {
    team.memberIds.forEach((memberId) => {
      membership.set(memberId, team.id);
    });
  });

  let changed = false;
  const normalized = students.map((student) => {
    const teamId = membership.get(student.id);
    if (teamId !== student.teamId) {
      changed = true;
      return { ...student, teamId };
    }
    if (!teamId && student.teamId) {
      changed = true;
      return { ...student, teamId: undefined };
    }
    return student;
  });
  return changed ? normalized : students;
}

function normalizeState(raw: AppState): AppState {
  const students = raw.students ?? [];
  const quests = raw.quests ?? [];
  const logs = sortLogs(raw.logs ?? []);
  const teams = normalizeTeams(raw.teams, students);
  const syncedStudents = syncStudentsWithTeams(students, teams);
  const normalizedStudents = syncedStudents.map((student) => normalizeStudentAvatar(student));
  const hasData = normalizedStudents.length > 0 || quests.length > 0 || logs.length > 0;
  const settings = normalizeSettings({
    ...raw.settings,
    onboardingCompleted: hasData ? true : raw.settings?.onboardingCompleted,
  });
  const classProgress = computeClassProgress(normalizedStudents, settings);
  const categories = Array.isArray(raw.categories)
    ? raw.categories.map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color ?? null,
      }))
    : [];
  return {
    students: normalizedStudents,
    quests,
    logs,
    teams,
    settings,
    version: raw.version ?? 1,
    classProgress,
    badgeDefs: raw.badgeDefs ?? [],
    categories,
  };
}

function markOnboardingComplete(state: AppState): AppState {
  if (state.settings.onboardingCompleted) {
    return state;
  }
  const hasData = state.students.length > 0 || state.quests.length > 0 || state.logs.length > 0;
  if (!hasData) {
    return state;
  }
  return {
    ...state,
    settings: { ...state.settings, onboardingCompleted: true },
  };
}

const arraysEqual = (a: ID[], b: ID[]) => a.length === b.length && a.every((value, index) => value === b[index]);

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT':
      return normalizeState(action.state);
    case 'ADD_STUDENT': {
      const alias = action.alias.trim();
      if (!alias) return state;
      const next = addStudent(state, { id: createId(), alias, xp: 0 });
      return markOnboardingComplete(next);
    }
    case 'ADD_STUDENTS_BULK': {
      const aliases = action.aliases ?? [];
      if (!aliases.length) return state;

      const existing = new Set(state.students.map((student) => student.alias.trim().toLowerCase()));
      let next = state;
      let changed = false;

      for (const rawAlias of aliases) {
        const alias = rawAlias.trim();
        if (!alias) continue;
        const normalized = alias.toLowerCase();
        if (existing.has(normalized)) continue;
        existing.add(normalized);
        const previous = next;
        next = addStudent(previous, { id: createId(), alias, xp: 0 });
        if (next !== previous) {
          changed = true;
        }
      }

      return changed ? markOnboardingComplete(next) : state;
    }
    case 'UPDATE_STUDENT_ALIAS':
      return {
        ...state,
        students: state.students.map((student) =>
          student.id === action.id ? { ...student, alias: action.alias.trim() || student.alias } : student,
        ),
      };
    case 'UPDATE_STUDENT_AVATAR': {
      let changed = false;
      const students = state.students.map((student) => {
        if (student.id !== action.id) {
          return student;
        }
        const base = normalizeStudentAvatar(student);
        const nextMode = action.updates.avatarMode ?? base.avatarMode ?? 'procedural';
        const requestedPack = action.updates.avatarPack
          ? normalizeAvatarPack(action.updates.avatarPack)
          : base.avatarPack ?? normalizeAvatarPack();
        const currentPack = base.avatarPack ?? normalizeAvatarPack();
        const packChanged = !stageKeysEqual(requestedPack.stageKeys, currentPack.stageKeys);
        const modeChanged = nextMode !== base.avatarMode;
        if (!packChanged && !modeChanged) {
          if (base !== student) {
            changed = true;
          }
          return base;
        }
        changed = true;
        return {
          ...base,
          avatarMode: nextMode,
          avatarPack: requestedPack,
        } satisfies Student;
      });
      return changed ? { ...state, students } : state;
    }
    case 'REMOVE_STUDENT': {
      const students = state.students.filter((student) => student.id !== action.id);
      const teams = state.teams.map((team) => ({
        ...team,
        memberIds: team.memberIds.filter((memberId) => memberId !== action.id),
      }));
      const logs = state.logs.filter((log) => log.studentId !== action.id);
      const classProgress = computeClassProgress(students, state.settings);
      return {
        ...state,
        students,
        teams,
        logs,
        classProgress,
      };
    }
    case 'REMOVE_STUDENTS_BULK': {
      const ids = action.ids ?? [];
      if (!ids.length) return state;
      const removal = new Set(ids);
      const students = state.students.filter((student) => !removal.has(student.id));
      if (students.length === state.students.length) return state;
      const teams = state.teams.map((team) => ({
        ...team,
        memberIds: team.memberIds.filter((memberId) => !removal.has(memberId)),
      }));
      const logs = state.logs.filter((log) => !removal.has(log.studentId));
      const classProgress = computeClassProgress(students, state.settings);
      return {
        ...state,
        students,
        teams,
        logs,
        classProgress,
      };
    }
    case 'ADD_QUEST': {
      const quest = action.quest;
      if (!quest.name.trim()) return state;
      const next = addQuest(state, quest);
      return markOnboardingComplete(next);
    }
    case 'UPDATE_QUEST': {
      const { id, updates } = action;
      return {
        ...state,
        quests: state.quests.map((quest) => {
          if (quest.id !== id) return quest;
          let next = { ...quest, ...updates } satisfies Quest;
          if (Object.prototype.hasOwnProperty.call(updates, 'categoryId')) {
            const categoryId = updates.categoryId ?? null;
            const categoryName = categoryId
              ? state.categories.find((category) => category.id === categoryId)?.name ?? null
              : null;
            next = { ...next, categoryId, category: categoryName } satisfies Quest;
          } else if (Object.prototype.hasOwnProperty.call(updates, 'category')) {
            const raw = updates.category;
            const categoryName =
              typeof raw === 'string' && raw.trim().length > 0 ? raw.trim() : raw === null ? null : quest.category;
            next = { ...next, category: categoryName ?? null } satisfies Quest;
          }
          return next;
        }),
      };
    }
    case 'REMOVE_QUEST':
      return {
        ...state,
        quests: state.quests.filter((quest) => quest.id !== action.id),
        logs: state.logs.filter((log) => log.questId !== action.id),
      };
    case 'ADD_BADGE_DEF': {
      const definition = action.definition;
      const name = typeof definition.name === 'string' ? definition.name.trim() : '';
      if (!name) {
        return state;
      }
      const rawDescription =
        typeof definition.description === 'string' ? definition.description.trim() : '';
      const description = rawDescription.length > 0 ? rawDescription : undefined;
      const rawCategory = typeof definition.category === 'string' ? definition.category.trim() : '';
      const rawCategoryId =
        typeof definition.categoryId === 'string' && definition.categoryId.trim().length > 0
          ? definition.categoryId.trim()
          : null;
      const categoryNameFromId = rawCategoryId
        ? state.categories.find((category) => category.id === rawCategoryId)?.name ?? null
        : null;
      const category = categoryNameFromId ?? (rawCategory.length > 0 ? rawCategory : null);
      const categoryId = rawCategoryId;
      const rawIconKey =
        typeof definition.iconKey === 'string' ? definition.iconKey.trim() : '';
      const iconKey = rawIconKey.length > 0 ? rawIconKey : null;
      let rule = definition.rule ?? null;
      if (rule) {
        const threshold = Number.isFinite(rule.threshold)
          ? Math.max(0, Math.round(rule.threshold))
          : 0;
        if (rule.type === 'total_xp') {
          rule = { type: 'total_xp', threshold };
        } else if (rule.type === 'category_xp') {
          const rawRuleCategoryId =
            typeof rule.categoryId === 'string' && rule.categoryId.trim().length > 0
              ? rule.categoryId.trim()
              : null;
          const rawRuleCategory = typeof rule.category === 'string' ? rule.category.trim() : '';
          const resolvedRuleCategoryId = rawRuleCategoryId ?? categoryId;
          const ruleCategoryNameFromId = resolvedRuleCategoryId
            ? state.categories.find((category) => category.id === resolvedRuleCategoryId)?.name ?? null
            : null;
          const ruleCategory =
            ruleCategoryNameFromId ??
            (rawRuleCategory.length > 0
              ? rawRuleCategory
              : category ?? 'uncategorized');
          rule = {
            type: 'category_xp',
            category: ruleCategory,
            categoryId: resolvedRuleCategoryId ?? null,
            threshold,
          };
        } else {
          rule = null;
        }
      }
      const sanitized: BadgeDefinition = {
        ...definition,
        name,
        description,
        category,
        categoryId,
        iconKey,
        rule,
      };
      const existingIndex = state.badgeDefs.findIndex((entry) => entry.id === sanitized.id);
      if (existingIndex >= 0) {
        const badgeDefs = state.badgeDefs.map((entry, index) =>
          index === existingIndex ? sanitized : entry,
        );
        return { ...state, badgeDefs };
      }
      return { ...state, badgeDefs: [...state.badgeDefs, sanitized] };
    }
    case 'REMOVE_BADGE_DEF': {
      const badgeDefs = state.badgeDefs.filter((entry) => entry.id !== action.id);
      if (badgeDefs.length === state.badgeDefs.length) {
        return state;
      }
      return { ...state, badgeDefs };
    }
    case 'AWARD_BADGE_MANUAL': {
      const definition = state.badgeDefs.find((entry) => entry.id === action.badgeId);
      if (!definition) {
        return state;
      }
      const studentIndex = state.students.findIndex((student) => student.id === action.studentId);
      if (studentIndex < 0) {
        return state;
      }
      const target = state.students[studentIndex];
      const existingBadges = Array.isArray(target.badges) ? target.badges : [];
      if (existingBadges.some((badge) => badge.id === definition.id)) {
        return state;
      }
      const awardedBadge = {
        id: definition.id,
        name: definition.name,
        iconKey: definition.iconKey ?? null,
        description: definition.description,
        awardedAt: new Date().toISOString(),
      } satisfies Student['badges'][number];
      const students = state.students.map((student, index) =>
        index === studentIndex ? { ...student, badges: [...existingBadges, awardedBadge] } : student,
      );
      return markOnboardingComplete({ ...state, students });
    }
    case 'CATEGORY_CREATE': {
      const name = action.name.trim();
      if (!name) return state;
      const exists = state.categories.some((category) => category.name.toLowerCase() === name.toLowerCase());
      if (exists) return state;
      const category = { id: createId(), name, color: null };
      return { ...state, categories: [...state.categories, category] };
    }
    case 'CATEGORY_DELETE': {
      const { id } = action;
      const inUse =
        state.quests.some((quest) => quest.categoryId === id) ||
        state.badgeDefs.some(
          (definition) =>
            definition.categoryId === id ||
            (definition.rule?.type === 'category_xp' && definition.rule.categoryId === id),
        );
      if (inUse) return state;
      const categories = state.categories.filter((category) => category.id !== id);
      if (categories.length === state.categories.length) return state;
      return { ...state, categories };
    }
    case 'TOGGLE_QUEST': {
      const quest = state.quests.find((q) => q.id === action.id);
      if (!quest) return state;
      return setQuestActive(state, action.id, !quest.active);
    }
    case 'AWARD': {
      const next = awardQuest(state, action.payload);
      if (next === state || next.logs === state.logs) return next;
      return { ...next, logs: sortLogs(next.logs) };
    }
    case 'UNDO_LAST': {
      const [last, ...rest] = state.logs;
      if (!last) return state;
      const students = state.students.map((student) => {
        if (student.id !== last.studentId) return student;
        const nextXP = state.settings.allowNegativeXP
          ? student.xp - last.xp
          : Math.max(0, student.xp - last.xp);
        return {
          ...student,
          xp: nextXP,
          level: Math.max(1, levelFromXP(Math.max(0, nextXP), state.settings.xpPerLevel)),
        };
      });
      const classProgress = computeClassProgress(students, state.settings);
      return { ...state, students, logs: rest, classProgress };
    }
    case 'RESET_SEASON': {
      const baseLevel = Math.max(1, levelFromXP(0, state.settings.xpPerLevel));
      const students = state.students.map((student) => ({
        ...student,
        xp: 0,
        level: baseLevel,
        streaks: {},
        lastAwardedDay: {},
        badges: [],
      }));
      const classProgress = computeClassProgress(students, state.settings);
      return {
        ...state,
        students,
        logs: [],
        classProgress,
      };
    }
    case 'ADD_GROUP': {
      const name = action.name.trim() || `Gruppe ${state.teams.length + 1}`;
      const team: Team = { id: createId(), name, memberIds: [] };
      return { ...state, teams: [...state.teams, team] };
    }
    case 'REMOVE_GROUP': {
      const teams = state.teams.filter((team) => team.id !== action.id);
      if (teams.length === state.teams.length) return state;
      const students = state.students.map((student) =>
        student.teamId === action.id ? { ...student, teamId: undefined } : student,
      );
      return { ...state, teams, students };
    }
    case 'RENAME_GROUP': {
      const name = action.name.trim() || 'Gruppe';
      let changed = false;
      const teams = state.teams.map((team) => {
        if (team.id !== action.id) return team;
        if (team.name === name) return team;
        changed = true;
        return { ...team, name };
      });
      return changed ? { ...state, teams } : state;
    }
    case 'SET_GROUP_MEMBERS': {
      const targetTeam = state.teams.find((team) => team.id === action.id);
      if (!targetTeam) return state;
      const validMembers = unique(
        action.memberIds.filter((memberId) => state.students.some((student) => student.id === memberId)),
      );
      const memberSet = new Set(validMembers);
      let teamsChanged = false;
      const teams = state.teams.map((team) => {
        if (team.id === action.id) {
          if (arraysEqual(team.memberIds, validMembers)) {
            return team;
          }
          teamsChanged = true;
          return { ...team, memberIds: validMembers };
        }
        const filtered = team.memberIds.filter((memberId) => !memberSet.has(memberId));
        if (filtered.length === team.memberIds.length) {
          return team;
        }
        teamsChanged = true;
        return { ...team, memberIds: filtered };
      });

      let studentsChanged = false;
      const students = state.students.map((student) => {
        const shouldBelong = memberSet.has(student.id);
        if (shouldBelong && student.teamId !== action.id) {
          studentsChanged = true;
          return { ...student, teamId: action.id };
        }
        if (!shouldBelong && student.teamId === action.id) {
          studentsChanged = true;
          return { ...student, teamId: undefined };
        }
        return student;
      });

      if (!teamsChanged && !studentsChanged) return state;
      return {
        ...state,
        teams,
        students: studentsChanged ? students : state.students,
      };
    }
    case 'UPDATE_SETTINGS': {
      const settings = normalizeSettings({ ...state.settings, ...action.updates });
      const xpPerLevelChanged = settings.xpPerLevel !== state.settings.xpPerLevel;
      let students = state.students;
      if (xpPerLevelChanged) {
        let changed = false;
        students = state.students.map((student) => {
          const sanitizedXP = Number.isFinite(student.xp) ? Math.max(0, student.xp) : 0;
          const nextLevel = Math.max(1, levelFromXP(sanitizedXP, settings.xpPerLevel));
          if (nextLevel === student.level) {
            return student;
          }
          changed = true;
          return { ...student, level: nextLevel };
        });
        if (!changed) {
          students = state.students;
        }
      }
      const classProgress = computeClassProgress(students, settings);
      return {
        ...state,
        settings,
        classProgress,
        ...(students !== state.students ? { students } : {}),
      };
    }
    case 'IMPORT': {
      const parsed = JSON.parse(action.json);
      const clean = sanitizeState(parsed);
      if (!clean) {
        throw new Error('Invalid data shape');
      }
      const migrated = migrateState(clean) as AppState;
      return normalizeState(migrated);
    }
    default:
      return state;
  }
}

const Ctx = React.createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const storage = React.useMemo(createStorageAdapter, []);
  const [state, dispatch] = React.useReducer(reducer, normalizeState(createInitialState(undefined, 1)));
  const hydratedRef = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await storage.loadState();
        if (saved && !cancelled) {
          dispatch({ type: 'INIT', state: saved });
        }
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  React.useEffect(() => {
    if (!hydratedRef.current) return;
    (async () => {
      await storage.saveState(state);
    })();
  }, [state, storage]);

  React.useEffect(() => {
    setEffectsSettings(ASSETS_ENABLED ? state.settings : null);
  }, [state.settings]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const value = React.useContext(Ctx);
  if (!value) throw new Error('AppContext missing');
  return value;
};
