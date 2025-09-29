import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventBus } from '@/lib/EventBus';
import { processAward } from '~/core/gameLogic';
import { calculateClassProgress } from '~/core/classProgress';
import type { AppState, Quest, Student } from '~/types/models';

const createStudent = (overrides: Partial<Student> = {}): Student => ({
  id: 'student-1',
  alias: 'Testy',
  xp: 0,
  level: 1,
  streaks: {},
  lastAwardedDay: {},
  badges: [],
  ...overrides,
});

const createState = (studentOverrides: Partial<Student> = {}): AppState => {
  const student = createStudent(studentOverrides);
  const totalXP = Math.max(0, student.xp);
  const classMilestoneStep = 1000;
  return {
    students: [student],
    teams: [],
    quests: [],
    categories: [],
    logs: [],
    settings: {
      className: 'Demo',
      xpPerLevel: 100,
      streakThresholdForBadge: 2,
      allowNegativeXP: false,
      classMilestoneStep,
      classStarIconKey: null,
      classStarsName: 'Stern',
    },
    version: 1,
    classProgress: calculateClassProgress(totalXP, classMilestoneStep),
    badgeDefs: [],
  };
};

const createQuest = (overrides: Partial<Quest> = {}): Quest => ({
  id: 'quest-1',
  name: 'Quest',
  xp: 50,
  description: 'Test quest',
  type: 'repeatable',
  target: 'individual',
  active: true,
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('processAward', () => {
  it('updates xp, level and logs for repeatable quests', () => {
    const quest = createQuest();
    const state = createState();
    const emitSpy = vi.spyOn(eventBus, 'emit');

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 9));
    vi.spyOn(Math, 'random').mockReturnValue(0.42);

    const updated = processAward(state, 'student-1', quest, 'Keep going');

    expect(updated.students[0]).toMatchObject({
      xp: 50,
      level: 1,
      streaks: { 'quest-1': 1 },
      lastAwardedDay: { 'quest-1': '2024-01-01' },
    });
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith({
      type: 'xp:granted',
      amount: 50,
      newSegmentXP: 50,
    });
    expect(updated.logs).toHaveLength(1);
    expect(updated.logs[0]).toMatchObject({
      studentId: 'student-1',
      questId: 'quest-1',
      xp: 50,
      note: 'Keep going',
      timestamp: new Date(2024, 0, 1, 9).getTime(),
    });
    expect(updated.logs[0].id).toBe(`${new Date(2024, 0, 1, 9).getTime()}-0.42`);
  });

  it('prevents xp from dropping below zero when negatives are disallowed', () => {
    const quest = createQuest({ xp: -100 });
    const state = createState({ xp: 40 });
    const emitSpy = vi.spyOn(eventBus, 'emit');

    const updated = processAward(state, 'student-1', quest);

    expect(updated.students[0].xp).toBe(0);
    expect(updated.students[0].level).toBe(1);
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith({
      type: 'xp:granted',
      amount: -100,
      newSegmentXP: 0,
    });
  });

  it('allows negative xp when configured', () => {
    const quest = createQuest({ xp: -60 });
    const state = {
      ...createState({ xp: 10 }),
      settings: {
        className: 'Demo',
        xpPerLevel: 100,
        streakThresholdForBadge: 2,
        allowNegativeXP: true,
        classMilestoneStep: 1000,
        classStarIconKey: null,
        classStarsName: 'Stern',
      },
    } satisfies AppState;
    const emitSpy = vi.spyOn(eventBus, 'emit');

    const updated = processAward(state, 'student-1', quest);

    expect(updated.students[0].xp).toBe(-50);
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith({
      type: 'xp:granted',
      amount: -60,
      newSegmentXP: -50,
    });
  });

  it('ignores repeat awards for daily quests on the same day', () => {
    const quest = createQuest({ type: 'daily' });
    const state = createState();
    const emitSpy = vi.spyOn(eventBus, 'emit');

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 9));

    const once = processAward(state, 'student-1', quest);
    const twice = processAward(once, 'student-1', quest);

    expect(twice).toBe(once);
    expect(twice.logs).toHaveLength(1);
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('tracks streaks across consecutive days and awards badges', () => {
    const quest = createQuest({ type: 'daily', name: 'Mathe' });
    const state = createState();
    const emitSpy = vi.spyOn(eventBus, 'emit');

    vi.useFakeTimers();

    vi.setSystemTime(new Date(2024, 0, 1, 9));
    const first = processAward(state, 'student-1', quest);
    expect(first.students[0].streaks['quest-1']).toBe(1);

    vi.setSystemTime(new Date(2024, 0, 2, 9));
    const second = processAward(first, 'student-1', quest);
    expect(second.students[0].streaks['quest-1']).toBe(2);
    expect(second.students[0].badges).toHaveLength(1);
    expect(second.students[0].badges[0]).toMatchObject({
      id: 'streak-quest-1',
      name: 'Mathe 2er Streak',
    });

    vi.setSystemTime(new Date(2024, 0, 4, 9));
    const reset = processAward(second, 'student-1', quest);
    expect(reset.students[0].streaks['quest-1']).toBe(1);
    expect(emitSpy).toHaveBeenCalledTimes(3);
    expect(emitSpy).toHaveBeenNthCalledWith(1, {
      type: 'xp:granted',
      amount: 50,
      newSegmentXP: 50,
    });
    expect(emitSpy).toHaveBeenNthCalledWith(2, {
      type: 'xp:granted',
      amount: 50,
      newSegmentXP: 100,
    });
    expect(emitSpy).toHaveBeenNthCalledWith(3, {
      type: 'xp:granted',
      amount: 50,
      newSegmentXP: 150,
    });
  });

  it('prevents one-off quests from being repeated', () => {
    const quest = createQuest({ type: 'oneoff' });
    const state = createState();
    const emitSpy = vi.spyOn(eventBus, 'emit');

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 9));

    const first = processAward(state, 'student-1', quest);
    const second = processAward(first, 'student-1', quest);

    expect(second).toBe(first);
    expect(first.logs).toHaveLength(1);
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('returns original state when the student does not exist', () => {
    const quest = createQuest();
    const state = createState();
    const emitSpy = vi.spyOn(eventBus, 'emit');

    const result = processAward(state, 'missing', quest);
    expect(result).toBe(state);
    expect(emitSpy).not.toHaveBeenCalled();
  });
});
