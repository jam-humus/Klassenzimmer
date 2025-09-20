import { z } from 'zod';
import { DEFAULT_SETTINGS } from '../config';

export const ID = z.string().min(1);

export const Badge = z.object({
  id: ID, name: z.string().min(1),
  icon: z.string().optional(),
  description: z.string().optional(),
});

const AvatarPack = z.object({
  stageKeys: z.array(ID.nullable()).optional(),
});

export const Student = z.object({
  id: ID,
  alias: z.string().min(1),
  xp: z.number(),
  level: z.number(),
  streaks: z.record(ID, z.number()).default({}),
  lastAwardedDay: z.record(ID, z.string()).default({}),
  badges: z.array(Badge).default([]),
  teamId: ID.optional(),
  avatarMode: z.enum(['procedural', 'imagePack']).optional(),
  avatarPack: AvatarPack.optional(),
});

export const Team = z.object({
  id: ID,
  name: z.string().min(1),
  memberIds: z.array(ID).default([]),
});

export const Quest = z.object({
  id: ID,
  name: z.string().min(1),
  description: z.string().optional(),
  xp: z.number(),
  type: z.enum(['daily','repeatable','oneoff']),
  target: z.enum(['individual','team']),
  isPersonalTo: ID.optional(),
  active: z.boolean(),
});

export const LogEntry = z.object({
  id: ID,
  timestamp: z.number(),
  studentId: ID,
  questId: ID,
  questName: z.string(),
  xp: z.number(), // can be negative for shop
  note: z.string().optional(),
});

export const Settings = z.object({
  className: z.string(),
  xpPerLevel: z.number().positive(),
  streakThresholdForBadge: z.number().positive(),
  allowNegativeXP: z.boolean().optional(),
  // non-breaking optional flags
  sfxEnabled: z.boolean().optional(),
  compactMode: z.boolean().optional(),
  shortcutsEnabled: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
  flags: z.record(z.string(), z.boolean()).optional(),
  classStarIconKey: z.string().optional().nullable(),
  classMilestoneStep: z.number().int().positive().optional(),
  classStarsName: z.string().optional(),
});

export const ClassProgress = z.object({
  totalXP: z.number().min(0),
  stars: z.number().min(0),
});

export const AppState = z.object({
  students: z.array(Student),
  teams: z.array(Team),
  quests: z.array(Quest),
  logs: z.array(LogEntry),
  settings: Settings,
  version: z.number().int(),
  classProgress: ClassProgress,
});

export type AppStateType = z.infer<typeof AppState>;

/** Best-effort repair:
 * - fills defaults for missing objects/arrays
 * - clamps NaN xp/level to 0
 */
const randomId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const asId = (value: unknown): string | null => asString(value);

const asNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const sanitizeNumberRecord = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value)
    .map(([key, num]) => {
      const id = asId(key);
      if (!id) return null;
      const safe = Math.max(0, Math.floor(asNumber(num, 0)));
      return [id, safe] as const;
    })
    .filter(Boolean) as [string, number][];
  return Object.fromEntries(entries);
};

const sanitizeStringRecord = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value)
    .map(([key, val]) => {
      const id = asId(key);
      const str = asString(val);
      if (!id || !str) return null;
      return [id, str] as const;
    })
    .filter(Boolean) as [string, string][];
  return Object.fromEntries(entries);
};

const sanitizeBadges = (value: unknown): AppStateType['students'][number]['badges'] => {
  if (!Array.isArray(value)) return [];
  const items: AppStateType['students'][number]['badges'] = [];
  value.forEach((candidate) => {
    if (!isRecord(candidate)) return;
    const id = asId(candidate.id) ?? randomId();
    const name = asString(candidate.name) ?? 'Abzeichen';
    const icon = asString(candidate.icon) ?? undefined;
    const description = asString(candidate.description) ?? undefined;
    items.push({ id, name, icon, description });
  });
  return items;
};

const AVATAR_STAGE_COUNT = 3;

const sanitizeStageKeys = (value: unknown): (string | null)[] => {
  if (!Array.isArray(value)) {
    return Array.from({ length: AVATAR_STAGE_COUNT }, () => null);
  }
  return Array.from({ length: AVATAR_STAGE_COUNT }, (_, index) => asString(value[index]) ?? null);
};

const sanitizeAvatarPack = (value: unknown): AppStateType['students'][number]['avatarPack'] => {
  if (!isRecord(value)) {
    return { stageKeys: sanitizeStageKeys(undefined) };
  }
  return { stageKeys: sanitizeStageKeys(value.stageKeys) };
};

const sanitizeFlags = (value: unknown): Record<string, boolean> | undefined => {
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value)
    .map(([key, val]) => {
      const id = asId(key);
      if (!id || typeof val !== 'boolean') return null;
      return [id, val] as const;
    })
    .filter(Boolean) as [string, boolean][];
  if (!entries.length) return undefined;
  return Object.fromEntries(entries);
};

const QUEST_TYPES = ['daily', 'repeatable', 'oneoff'] as const;
const QUEST_TARGETS = ['individual', 'team'] as const;

const isQuestType = (
  value: string | null,
): value is (typeof QUEST_TYPES)[number] =>
  value != null && (QUEST_TYPES as readonly string[]).includes(value);

const isQuestTarget = (
  value: string | null,
): value is (typeof QUEST_TARGETS)[number] =>
  value != null && (QUEST_TARGETS as readonly string[]).includes(value);

export function sanitizeState(raw: unknown): AppStateType | null {
  if (!isRecord(raw)) return null;

  const students: AppStateType['students'] = [];
  if (Array.isArray(raw.students)) {
    raw.students.forEach((candidate) => {
      if (!isRecord(candidate)) return;
      const id = asId(candidate.id) ?? randomId();
      const alias = asString(candidate.alias) ?? 'Unbenannt';
      const xp = asNumber(candidate.xp, 0);
      const level = Math.max(1, Math.floor(asNumber(candidate.level, 1)) || 1);
      const streaks = sanitizeNumberRecord(candidate.streaks);
      const lastAwardedDay = sanitizeStringRecord(candidate.lastAwardedDay);
      const badges = sanitizeBadges(candidate.badges);
      const teamId = asId(candidate.teamId) ?? undefined;
      const avatarMode = candidate.avatarMode === 'imagePack' ? 'imagePack' : 'procedural';
      const avatarPack = sanitizeAvatarPack(candidate.avatarPack);
      students.push({ id, alias, xp, level, streaks, lastAwardedDay, badges, teamId, avatarMode, avatarPack });
    });
  }

  const teams: AppStateType['teams'] = [];
  if (Array.isArray(raw.teams)) {
    raw.teams.forEach((candidate) => {
      if (!isRecord(candidate)) return;
      const id = asId(candidate.id) ?? randomId();
      const name = asString(candidate.name) ?? 'Gruppe';
      const memberIds = Array.isArray(candidate.memberIds)
        ? Array.from(
            new Set(
              candidate.memberIds
                .map((member) => asId(member))
                .filter((member): member is string => Boolean(member)),
            ),
          )
        : [];
      teams.push({ id, name, memberIds });
    });
  }

  const quests: AppStateType['quests'] = [];
  if (Array.isArray(raw.quests)) {
    raw.quests.forEach((candidate) => {
      if (!isRecord(candidate)) return;
      const id = asId(candidate.id) ?? randomId();
      const name = asString(candidate.name) ?? 'Quest';
      const description = asString(candidate.description) ?? undefined;
      const xp = asNumber(candidate.xp, 0);
      const typeRaw = asString(candidate.type);
      const targetRaw = asString(candidate.target);
      const type = isQuestType(typeRaw) ? typeRaw : 'daily';
      const target = isQuestTarget(targetRaw) ? targetRaw : 'individual';
      const isPersonalTo = asId(candidate.isPersonalTo) ?? undefined;
      const active = asBoolean(candidate.active, true);
      quests.push({ id, name, description, xp, type, target, isPersonalTo, active });
    });
  }

  const logs: AppStateType['logs'] = [];
  if (Array.isArray(raw.logs)) {
    raw.logs.forEach((candidate) => {
      if (!isRecord(candidate)) return;
      const id = asId(candidate.id) ?? randomId();
      const studentId = asId(candidate.studentId);
      const questId = asId(candidate.questId);
      if (!studentId || !questId) return;
      const questName = asString(candidate.questName) ?? 'Unbekannt';
      const timestamp = Math.max(0, Math.floor(asNumber(candidate.timestamp, Date.now())));
      const xp = asNumber(candidate.xp, 0);
      const note = asString(candidate.note) ?? undefined;
      logs.push({ id, timestamp, studentId, questId, questName, xp, note });
    });
  }

  const settingsRecord = isRecord(raw.settings) ? raw.settings : {};
  const settings: AppStateType['settings'] = {
    className: asString(settingsRecord.className) ?? 'Meine Klasse',
    xpPerLevel: Math.max(1, Math.floor(asNumber(settingsRecord.xpPerLevel, 100)) || 1),
    streakThresholdForBadge: Math.max(1, Math.floor(asNumber(settingsRecord.streakThresholdForBadge, 5)) || 1),
    allowNegativeXP: asBoolean(settingsRecord.allowNegativeXP, false),
    sfxEnabled: asBoolean(settingsRecord.sfxEnabled, false),
    compactMode: asBoolean(settingsRecord.compactMode, false),
    shortcutsEnabled: asBoolean(settingsRecord.shortcutsEnabled, true),
    onboardingCompleted: asBoolean(settingsRecord.onboardingCompleted, false),
    flags: sanitizeFlags(settingsRecord.flags),
    classStarIconKey: asString(settingsRecord.classStarIconKey),
    classMilestoneStep:
      Math.max(1, Math.floor(asNumber(settingsRecord.classMilestoneStep, DEFAULT_SETTINGS.classMilestoneStep)) || 1) ||
      DEFAULT_SETTINGS.classMilestoneStep,
    classStarsName: asString(settingsRecord.classStarsName) ?? DEFAULT_SETTINGS.classStarsName,
  };

  const totalXP = Math.max(
    0,
    students.reduce((sum, student) => sum + (Number.isFinite(student.xp) ? student.xp : 0), 0),
  );
  const step = Math.max(1, settings.classMilestoneStep ?? DEFAULT_SETTINGS.classMilestoneStep);
  const classProgress: AppStateType['classProgress'] = {
    totalXP,
    stars: Math.floor(totalXP / step),
  };

  const version = Math.max(1, Math.trunc(asNumber(raw.version, 1)) || 1);

  const candidate = {
    students,
    teams,
    quests,
    logs,
    settings,
    version,
    classProgress,
  } satisfies AppStateType;

  const result = AppState.safeParse(candidate);
  return result.success ? result.data : null;
}
