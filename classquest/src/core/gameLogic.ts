import { DEFAULT_SETTINGS } from './config';
import { todayKey, levelFromXP } from './xp';
import { shouldAutoAward } from './selectors/badges';
import type { Student, Quest, LogEntry, AppState, ID } from '~/types/models';

const getClassMilestoneStep = (state: AppState) =>
  Math.max(1, state.settings.classMilestoneStep ?? DEFAULT_SETTINGS.classMilestoneStep);

const applyClassProgressDelta = (state: AppState, deltaXP: number) => {
  const prev = Math.max(0, state.classProgress?.totalXP ?? 0);
  const totalXP = Math.max(0, prev + deltaXP);
  const step = getClassMilestoneStep(state);
  const stars = Math.floor(totalXP / step);
  return { totalXP, stars };
};

const awardStreak = (
  student: Student,
  questId: ID,
  questName: string,
  dateKey: string,
  streakThresholdForBadge: number,
) => {
  const streaks = { ...student.streaks };
  const lastDays = { ...student.lastAwardedDay };
  const previousDay = new Date();
  previousDay.setDate(previousDay.getDate() - 1);
  const yesterdayKey = todayKey(previousDay);

  const lastKey = lastDays[questId];
  const isConsecutive = lastKey === yesterdayKey;
  const nextStreak = isConsecutive ? (streaks[questId] ?? 0) + 1 : 1;

  streaks[questId] = nextStreak;
  lastDays[questId] = dateKey;

  const hasBadge = student.badges.some((b) => b.id === `streak-${questId}`);
  const badges = hasBadge || nextStreak < streakThresholdForBadge
    ? student.badges.slice()
    : student.badges.concat({
        id: `streak-${questId}`,
        name: `${questName} ${streakThresholdForBadge}er Streak`,
        iconKey: null,
        awardedAt: new Date().toISOString(),
      });

  return { streaks, lastDays, badges };
};

const resolveQuestCategory = (state: AppState, quest: Quest) => {
  const categoryId = quest.categoryId ?? null;
  if (categoryId) {
    const category = state.categories?.find((cat) => cat.id === categoryId);
    return {
      id: categoryId,
      name: category?.name ?? quest.category ?? null,
    };
  }
  return {
    id: null,
    name: quest.category ?? null,
  };
};

const buildLogEntry = (
  log: LogEntry,
  quest: Quest,
  studentId: ID,
  note: string | undefined,
  category: { id: ID | null; name: string | null },
): LogEntry => ({
  ...log,
  questId: quest.id,
  questName: quest.name,
  questCategory: category.name ?? quest.category ?? log.questCategory ?? null,
  questCategoryId: category.id ?? quest.categoryId ?? log.questCategoryId ?? null,
  studentId,
  note,
});

const appendAutoBadges = (state: AppState, student: Student, logs: LogEntry[]): Student => {
  const defs = state.badgeDefs ?? [];
  if (!defs.length) {
    return student;
  }
  const evaluationState: AppState = { ...state, logs };
  let badges = student.badges;
  let changed = false;
  for (const def of defs) {
    if (!def.rule) continue;
    if (badges.some((badge) => badge.id === def.id)) continue;
    const snapshot: Student = { ...student, badges };
    if (shouldAutoAward(evaluationState, snapshot, def)) {
      badges = badges.concat({
        id: def.id,
        name: def.name,
        iconKey: def.iconKey ?? null,
        description: def.description,
        awardedAt: new Date().toISOString(),
      });
      changed = true;
    }
  }
  return changed ? { ...student, badges } : student;
};

export function processAward(state: AppState, studentId: ID, quest: Quest, note?: string): AppState {
  const student = state.students.find((s) => s.id === studentId);
  if (!student) return state;

  const dateKey = todayKey();
  if (quest.type === 'daily' && student.lastAwardedDay[quest.id] === dateKey) {
    return state;
  }
  if (quest.type === 'oneoff' && (student.streaks[quest.id] ?? 0) > 0) {
    return state;
  }

  const xpGain = quest.xp;
  const updatedXP = state.settings.allowNegativeXP
    ? student.xp + xpGain
    : Math.max(0, student.xp + xpGain);
  const level = Math.max(1, levelFromXP(updatedXP, state.settings.xpPerLevel));

  let streaks = student.streaks;
  let lastAwardedDay = student.lastAwardedDay;
  let badges = student.badges;

  if (quest.type === 'daily') {
    const update = awardStreak(
      student,
      quest.id,
      quest.name,
      dateKey,
      state.settings.streakThresholdForBadge,
    );
    streaks = update.streaks;
    lastAwardedDay = update.lastDays;
    badges = update.badges;
  } else {
    streaks = { ...streaks, [quest.id]: (streaks[quest.id] ?? 0) + 1 };
    lastAwardedDay = { ...lastAwardedDay, [quest.id]: dateKey };
  }

  const updatedStudent: Student = {
    ...student,
    xp: updatedXP,
    level,
    streaks,
    lastAwardedDay,
    badges,
  };

  const deltaXP = updatedStudent.xp - student.xp;
  const classProgress = applyClassProgressDelta(state, deltaXP);

  const timestamp = Date.now();
  const category = resolveQuestCategory(state, quest);
  const log: LogEntry = buildLogEntry(
    {
      id: `${timestamp}-${Math.random()}`,
      timestamp,
      studentId,
      questId: quest.id,
      questName: quest.name,
      questCategory: category.name ?? null,
      questCategoryId: category.id ?? null,
      xp: quest.xp,
    },
    quest,
    studentId,
    note,
    category,
  );

  const logs = [...state.logs, log];
  const finalStudent = appendAutoBadges(state, updatedStudent, logs);

  return {
    ...state,
    students: state.students.map((s) => (s.id === studentId ? finalStudent : s)),
    logs,
    classProgress,
  };
}
