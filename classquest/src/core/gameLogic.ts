import type { AppState, ID } from '../types/models';
import { levelFromXP, todayKey as realTodayKey } from './xp';

export interface LogicDeps {
  todayKey: () => string;
  now: () => number;
  makeId: () => ID;
}

export const defaultDeps: LogicDeps = {
  todayKey: () => realTodayKey(),
  now: () => Date.now(),
  makeId: () => globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(36).slice(2)}`
};

const streakBadgeId = (n: number) => `${n}-day-streak-badge`;

export function processAward(
  state: AppState,
  studentId: ID,
  questId: ID,
  deps: LogicDeps = defaultDeps
): AppState {
  const day = deps.todayKey();

  const student = state.students.find(s => s.id === studentId);
  const quest = state.quests.find(q => q.id === questId);
  if (!student || !quest || !quest.active) return state;

  if (quest.type === 'daily') {
    if (student.lastAwardedDay[questId] === day) return state;
  }
  if (quest.type === 'oneoff') {
    if (student.lastAwardedDay[questId]) return state;
  }

  const prevStreak = student.streaks[questId] ?? 0;
  const lastDay = student.lastAwardedDay[questId];

  const yesterday = (() => {
    const [y, m, d] = day.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    return dt.toISOString().slice(0, 10);
  })();

  let newStreak = 1;
  if (lastDay === yesterday) newStreak = prevStreak + 1;
  else if (lastDay === day) newStreak = prevStreak;
  else newStreak = 1;

  const newXP = student.xp + quest.xp;
  const newLevel = levelFromXP(newXP, state.settings.xpPerLevel);

  const threshold = state.settings.streakThresholdForBadge;
  const candidateBadgeId = streakBadgeId(threshold);
  const alreadyHas = student.awardedBadgeIds.includes(candidateBadgeId);
  const shouldAwardBadge = newStreak === threshold && !alreadyHas;

  const updatedStudent = {
    ...student,
    xp: newXP,
    level: newLevel,
    streaks: { ...student.streaks, [questId]: newStreak },
    lastAwardedDay: { ...student.lastAwardedDay, [questId]: day },
    awardedBadgeIds: shouldAwardBadge
      ? [...student.awardedBadgeIds, candidateBadgeId]
      : student.awardedBadgeIds
  };

  const newLogEntry = {
    id: deps.makeId(),
    timestamp: deps.now(),
    studentId,
    questId,
    questName: quest.name,
    xpAwarded: quest.xp
  };

  return {
    ...state,
    students: state.students.map(s => (s.id === studentId ? updatedStudent : s)),
    log: [...state.log, newLogEntry]
  };
}
