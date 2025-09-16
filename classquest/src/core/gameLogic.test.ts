import { describe, expect, it } from 'vitest';
import { processAward, type LogicDeps } from './gameLogic';
import type { AppState, LogEntry, Quest, Settings, Student } from '../types/models';

const fixedDay = '2025-09-16';
const deps: LogicDeps = {
  todayKey: () => fixedDay,
  now: () => 1000,
  makeId: () => 'log-1'
};

const computeYesterday = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return dt.toISOString().slice(0, 10);
};

const defaultSettings: Settings = {
  className: 'Klasse 7a',
  xpPerLevel: 100,
  streakThresholdForBadge: 5
};

const makeStudent = (overrides: Partial<Student> = {}): Student => {
  const { streaks, lastAwardedDay, awardedBadgeIds, ...rest } = overrides;
  return {
    id: 'student-1',
    alias: 'Alice',
    xp: 0,
    level: 1,
    streaks: streaks ?? {},
    lastAwardedDay: lastAwardedDay ?? {},
    awardedBadgeIds: awardedBadgeIds ?? [],
    ...rest
  };
};

const makeQuest = (overrides: Partial<Quest> = {}): Quest => ({
  id: 'quest-1',
  name: 'Matheübung',
  xp: 50,
  type: 'repeatable',
  active: true,
  ...overrides
});

type StateOptions = {
  student?: Partial<Student>;
  quest?: Partial<Quest>;
  log?: LogEntry[];
  settings?: Partial<Settings>;
  students?: Student[];
  quests?: Quest[];
};

const createState = (options: StateOptions = {}): AppState => ({
  students: options.students ?? [makeStudent(options.student)],
  teams: [],
  quests: options.quests ?? [makeQuest(options.quest)],
  badges: [],
  log: options.log ?? [],
  settings: { ...defaultSettings, ...(options.settings ?? {}) }
});

describe('processAward', () => {
  it('awards XP, starts the streak and logs the completion', () => {
    const existingLog: LogEntry = {
      id: 'log-0',
      timestamp: 10,
      studentId: 'student-1',
      questId: 'quest-x',
      questName: 'Vortag',
      xpAwarded: 15
    };
    const state = createState({ log: [existingLog] });

    const result = processAward(state, 'student-1', 'quest-1', deps);

    expect(result).not.toBe(state);
    expect(state.log).toHaveLength(1);
    const updatedStudent = result.students[0];
    expect(updatedStudent.xp).toBe(50);
    expect(updatedStudent.level).toBe(1);
    expect(updatedStudent.streaks['quest-1']).toBe(1);
    expect(updatedStudent.lastAwardedDay['quest-1']).toBe(fixedDay);
    expect(updatedStudent.awardedBadgeIds).toEqual([]);

    expect(result.log).toHaveLength(2);
    expect(result.log[0]).toEqual(existingLog);
    expect(result.log[1]).toEqual({
      id: 'log-1',
      timestamp: 1000,
      studentId: 'student-1',
      questId: 'quest-1',
      questName: 'Matheübung',
      xpAwarded: 50
    });
  });

  it('increments the streak when the quest was completed yesterday', () => {
    const yesterday = computeYesterday(fixedDay);
    const state = createState({
      student: {
        xp: 90,
        level: 1,
        streaks: { 'quest-1': 2 },
        lastAwardedDay: { 'quest-1': yesterday }
      }
    });

    const result = processAward(state, 'student-1', 'quest-1', deps);
    const updatedStudent = result.students[0];

    expect(updatedStudent.streaks['quest-1']).toBe(3);
    expect(updatedStudent.xp).toBe(140);
    expect(updatedStudent.level).toBe(2);
  });

  it('resets the streak when a day was skipped', () => {
    const yesterday = computeYesterday(fixedDay);
    const dayBeforeYesterday = computeYesterday(yesterday);
    const state = createState({
      student: {
        streaks: { 'quest-1': 4 },
        lastAwardedDay: { 'quest-1': dayBeforeYesterday }
      }
    });

    const result = processAward(state, 'student-1', 'quest-1', deps);

    expect(result.students[0].streaks['quest-1']).toBe(1);
  });

  it('keeps the streak unchanged for repeatable quests on the same day', () => {
    const state = createState({
      student: {
        xp: 200,
        level: 3,
        streaks: { 'quest-1': 3 },
        lastAwardedDay: { 'quest-1': fixedDay }
      }
    });

    const result = processAward(state, 'student-1', 'quest-1', deps);
    const updatedStudent = result.students[0];

    expect(updatedStudent.streaks['quest-1']).toBe(3);
    expect(updatedStudent.xp).toBe(250);
    expect(updatedStudent.lastAwardedDay['quest-1']).toBe(fixedDay);
  });

  it('prevents awarding the same daily quest twice on the same day', () => {
    const state = createState({ quest: { type: 'daily' } });

    const firstAward = processAward(state, 'student-1', 'quest-1', deps);
    const secondAward = processAward(firstAward, 'student-1', 'quest-1', deps);

    expect(secondAward).toBe(firstAward);
    expect(firstAward.log).toHaveLength(1);
    expect(firstAward.students[0].xp).toBe(50);
  });

  it('prevents awarding a one-off quest more than once', () => {
    const state = createState({ quest: { type: 'oneoff' } });

    const firstAward = processAward(state, 'student-1', 'quest-1', deps);
    const secondAward = processAward(firstAward, 'student-1', 'quest-1', deps);

    expect(secondAward).toBe(firstAward);
    expect(firstAward.students[0].xp).toBe(50);
    expect(firstAward.log).toHaveLength(1);
  });

  it('awards the streak badge exactly once at the threshold', () => {
    const yesterday = computeYesterday(fixedDay);
    const state = createState({
      student: {
        streaks: { 'quest-1': 4 },
        lastAwardedDay: { 'quest-1': yesterday }
      }
    });

    const result = processAward(state, 'student-1', 'quest-1', deps);
    const updatedStudent = result.students[0];

    expect(updatedStudent.streaks['quest-1']).toBe(5);
    expect(updatedStudent.awardedBadgeIds).toEqual(['5-day-streak-badge']);

    const alreadyBadged = createState({
      student: {
        streaks: { 'quest-1': 4 },
        lastAwardedDay: { 'quest-1': yesterday },
        awardedBadgeIds: ['5-day-streak-badge']
      }
    });

    const again = processAward(alreadyBadged, 'student-1', 'quest-1', deps);
    expect(again.students[0].awardedBadgeIds).toEqual(['5-day-streak-badge']);
  });

  it('ignores inactive quests', () => {
    const state = createState({ quest: { active: false } });

    const result = processAward(state, 'student-1', 'quest-1', deps);

    expect(result).toBe(state);
  });

  it('returns the original state when the student is unknown', () => {
    const state = createState();

    const result = processAward(state, 'unknown', 'quest-1', deps);

    expect(result).toBe(state);
  });

  it('returns the original state when the quest is unknown', () => {
    const state = createState();

    const result = processAward(state, 'student-1', 'missing-quest', deps);

    expect(result).toBe(state);
  });
});
