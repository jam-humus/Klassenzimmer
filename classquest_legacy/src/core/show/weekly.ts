import { resolveAvatarStageIndex, sanitizeAvatarStageThresholds } from '~/core/avatarStages';
import { levelFromXP } from '~/core/xp';
import type { AppState } from '~/types/models';
import type { WeeklySnapshot } from '~/services/weeklyStorage';

export type WeeklyDelta = {
  studentId: string;
  alias: string;
  xpStart: number;
  xpEnd: number;
  levelStart: number;
  levelEnd: number;
  avatarStageStart: number;
  avatarStageEnd: number;
  newBadges: Array<{ id: string; name: string; iconKey?: string | null; awardedAt: string }>;
};

function startOfWeek(reference = new Date()): Date {
  const base = new Date(reference);
  base.setHours(0, 0, 0, 0);
  const day = base.getDay();
  const diff = day === 0 ? 6 : day - 1;
  base.setDate(base.getDate() - diff);
  return base;
}

function resolveFromDate(fromISO?: string): Date {
  if (!fromISO) {
    return startOfWeek();
  }
  const parsed = new Date(fromISO);
  if (Number.isNaN(parsed.getTime())) {
    return startOfWeek();
  }
  return parsed;
}

export function computeWeeklyDeltas(state: AppState, fromISO?: string): WeeklyDelta[] {
  const fromDate = resolveFromDate(fromISO);
  const fromTime = fromDate.getTime();
  const xpPerLevel = state.settings?.xpPerLevel ?? 100;
  const thresholds = sanitizeAvatarStageThresholds(state.settings?.avatarStageThresholds);
  const xpByStudent = new Map<string, number>();

  for (const entry of state.logs ?? []) {
    const timestamp = Number(entry.timestamp);
    if (!Number.isFinite(timestamp) || timestamp < fromTime) {
      continue;
    }
    const current = xpByStudent.get(entry.studentId) ?? 0;
    xpByStudent.set(entry.studentId, current + Math.max(0, entry.xp ?? 0));
  }

  return (state.students ?? []).map((student) => {
    const xpGain = xpByStudent.get(student.id) ?? 0;
    const xpEnd = Math.max(0, student.xp ?? 0);
    const xpStart = Math.max(0, xpEnd - xpGain);
    const levelEnd = Math.max(1, student.level ?? levelFromXP(xpEnd, xpPerLevel));
    const levelStart = Math.max(1, levelFromXP(xpStart, xpPerLevel));
    const avatarStageStart = resolveAvatarStageIndex(levelStart, thresholds);
    const avatarStageEnd = resolveAvatarStageIndex(levelEnd, thresholds);
    const newBadges = (student.badges ?? [])
      .filter((badge) => {
        const awardedTime = Date.parse(badge.awardedAt);
        return Number.isFinite(awardedTime) && awardedTime >= fromTime;
      })
      .map((badge) => ({
        id: badge.id,
        name: badge.name,
        iconKey: badge.iconKey ?? null,
        awardedAt: badge.awardedAt,
      }));

    return {
      studentId: student.id,
      alias: student.alias,
      xpStart,
      xpEnd,
      levelStart,
      levelEnd,
      avatarStageStart,
      avatarStageEnd,
      newBadges,
    } satisfies WeeklyDelta;
  });
}

export function computeDeltasFromSnapshot(state: AppState, snapshot: WeeklySnapshot): WeeklyDelta[] {
  const xpPerLevel = state.settings?.xpPerLevel ?? 100;
  const thresholds = sanitizeAvatarStageThresholds(state.settings?.avatarStageThresholds);
  const baseline = new Map(snapshot.students.map((entry) => [entry.id, entry]));

  return (state.students ?? []).map((student) => {
    const base = baseline.get(student.id);
    const xpEnd = Math.max(0, student.xp ?? 0);
    const xpStart = Math.max(0, base?.xp ?? 0);
    const levelEnd = Math.max(1, student.level ?? levelFromXP(xpEnd, xpPerLevel));
    const levelStart = Math.max(1, base?.level ?? levelFromXP(xpStart, xpPerLevel));
    const avatarStageEnd = resolveAvatarStageIndex(levelEnd, thresholds);
    const avatarStageStart = base?.stage ?? resolveAvatarStageIndex(levelStart, thresholds);
    const existingBadgeIds = new Set(base?.badgeIds ?? []);
    const newBadges = (student.badges ?? [])
      .filter((badge) => !existingBadgeIds.has(badge.id))
      .map((badge) => ({
        id: badge.id,
        name: badge.name,
        iconKey: badge.iconKey ?? null,
        awardedAt: badge.awardedAt,
      }));

    return {
      studentId: student.id,
      alias: student.alias,
      xpStart,
      xpEnd,
      levelStart,
      levelEnd,
      avatarStageStart,
      avatarStageEnd,
      newBadges,
    } satisfies WeeklyDelta;
  });
}
