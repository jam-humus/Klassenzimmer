import { todayKey, levelFromXP } from './xp';
import type { Student, Quest, LogEntry, AppState, ID } from '~/types/models';

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
      });

  return { streaks, lastDays, badges };
};

const buildLogEntry = (
  log: LogEntry,
  quest: Quest,
  studentId: ID,
  note?: string,
): LogEntry => ({
  ...log,
  questId: quest.id,
  questName: quest.name,
  studentId,
  note,
});

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

  const timestamp = Date.now();
  const log: LogEntry = buildLogEntry(
    {
      id: `${timestamp}-${Math.random()}`,
      timestamp,
      studentId,
      questId: quest.id,
      questName: quest.name,
      xp: quest.xp,
    },
    quest,
    studentId,
    note,
  );

  return {
    ...state,
    students: state.students.map((s) => (s.id === studentId ? updatedStudent : s)),
    logs: [...state.logs, log],
  };
}
