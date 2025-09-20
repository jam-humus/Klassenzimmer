import React from 'react';
import type { AppState, ID, LogEntry, Quest, Settings, Student, Team } from '~/types/models';
import { DEFAULT_SETTINGS } from '~/core/config';
import { createStorageAdapter } from '~/services/storage';
import { levelFromXP } from '~/core/xp';
import { addQuest, addStudent, awardQuest, createInitialState, setQuestActive } from '~/core/state';
import { sanitizeState } from '~/core/schema/appState';
import { migrateState } from '~/core/schema/migrate';

type AwardPayload = { questId: ID; studentId?: ID; teamId?: ID; note?: string };

type Action =
  | { type: 'INIT'; state: AppState }
  | { type: 'ADD_STUDENT'; alias: string }
  | { type: 'UPDATE_STUDENT_ALIAS'; id: ID; alias: string }
  | { type: 'REMOVE_STUDENT'; id: ID }
  | { type: 'ADD_STUDENTS_BULK'; aliases: string[] }
  | { type: 'REMOVE_STUDENTS_BULK'; ids: ID[] }
  | { type: 'ADD_QUEST'; quest: Quest }
  | { type: 'UPDATE_QUEST'; id: ID; updates: Partial<Pick<Quest, 'name' | 'xp' | 'type' | 'active'>> }
  | { type: 'REMOVE_QUEST'; id: ID }
  | { type: 'TOGGLE_QUEST'; id: ID }
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

function normalizeSettings(settings?: Partial<Settings>): Settings {
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {}),
    flags: {
      ...(DEFAULT_SETTINGS.flags ?? {}),
      ...((settings?.flags ?? {}) as Record<string, boolean>),
    },
  };
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
  const hasData = syncedStudents.length > 0 || quests.length > 0 || logs.length > 0;
  const settings = normalizeSettings({
    ...raw.settings,
    onboardingCompleted: hasData ? true : raw.settings?.onboardingCompleted,
  });
  return {
    students: syncedStudents,
    quests,
    logs,
    teams,
    settings,
    version: raw.version ?? 1,
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
    case 'REMOVE_STUDENT': {
      const students = state.students.filter((student) => student.id !== action.id);
      const teams = state.teams.map((team) => ({
        ...team,
        memberIds: team.memberIds.filter((memberId) => memberId !== action.id),
      }));
      return {
        ...state,
        students,
        teams,
        logs: state.logs.filter((log) => log.studentId !== action.id),
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
      return {
        ...state,
        students,
        teams,
        logs: state.logs.filter((log) => !removal.has(log.studentId)),
      };
    }
    case 'ADD_QUEST': {
      const quest = action.quest;
      if (!quest.name.trim()) return state;
      const next = addQuest(state, quest);
      return markOnboardingComplete(next);
    }
    case 'UPDATE_QUEST':
      return {
        ...state,
        quests: state.quests.map((quest) =>
          quest.id === action.id ? { ...quest, ...action.updates } : quest,
        ),
      };
    case 'REMOVE_QUEST':
      return {
        ...state,
        quests: state.quests.filter((quest) => quest.id !== action.id),
        logs: state.logs.filter((log) => log.questId !== action.id),
      };
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
      return { ...state, students, logs: rest };
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
      return {
        ...state,
        students,
        logs: [],
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
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: normalizeSettings({ ...state.settings, ...action.updates }),
      };
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

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
  const value = React.useContext(Ctx);
  if (!value) throw new Error('AppContext missing');
  return value;
};
