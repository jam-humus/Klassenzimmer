import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addQuest,
  addStudent,
  awardQuest,
  createInitialState,
} from '~/core/state';
import type { AppState } from '~/types/models';
import { soundManager } from '~/audio/SoundManager';
import { resetSoundQueues } from '~/audio/soundQueue';

describe('xp awards without blocking', () => {
  let state: AppState;
  let now = 0;
  let nowSpy: ReturnType<typeof vi.spyOn>;
  let playSpy: ReturnType<typeof vi.spyOn>;
  let advance: (ms: number) => Promise<void>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetSoundQueues();
    playSpy = vi.spyOn(soundManager, 'play').mockImplementation(() => {});
    now = 0;
    const perf = globalThis.performance as Performance;
    nowSpy = vi.spyOn(perf, 'now').mockImplementation(() => now);
    state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alice' });
    state = addStudent(state, { id: 's2', alias: 'Bob' });
    state = addStudent(state, { id: 's3', alias: 'Cara' });
    state = addQuest(state, {
      id: 'q1',
      name: 'Quest',
      xp: 20,
      type: 'repeatable',
      target: 'individual',
      active: true,
    });

    advance = async (ms: number) => {
      now += ms;
      vi.advanceTimersByTime(ms);
      await vi.runOnlyPendingTimersAsync();
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
    resetSoundQueues();
    playSpy.mockRestore();
    nowSpy.mockRestore();
    vi.useRealTimers();
  });

  it('awards xp on every rapid single award while throttling sound', async () => {
    for (let i = 0; i < 5; i += 1) {
      state = awardQuest(state, { questId: 'q1', studentId: 's1' });
    }

    await advance(400);

    const student = state.students.find((s) => s.id === 's1');
    expect(student?.xp).toBe(5 * 20);

    expect(playSpy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(playSpy.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('awards xp for every student in rapid multi-selection awards', async () => {
    const targets = ['s1', 's2', 's3'];
    for (let round = 0; round < 3; round += 1) {
      targets.forEach((id) => {
        state = awardQuest(state, { questId: 'q1', studentId: id });
      });
    }

    await advance(600);

    const xpById = new Map(state.students.map((s) => [s.id, s.xp]));
    targets.forEach((id) => {
      expect(xpById.get(id)).toBe(3 * 20);
    });

    expect(playSpy.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('queues level-up audio while always adding xp', async () => {
    state = addStudent(state, { id: 's4', alias: 'Dana', xp: 90 });

    state = awardQuest(state, { questId: 'q1', studentId: 's4' });

    await advance(400);

    const dana = state.students.find((s) => s.id === 's4');
    expect(dana?.xp).toBe(110);
    expect(dana?.level).toBeGreaterThan(1);

    const sounds = playSpy.mock.calls.map(([key]) => key);
    expect(sounds).toContain('level-up');
  });
});
