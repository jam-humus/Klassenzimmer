import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queueAppSound, queueSnapshotSound, resetSoundQueues } from '~/audio/soundQueue';
import { soundManager } from '~/audio/SoundManager';
import { addQuest, addStudent, awardQuest, createInitialState } from '~/core/state';

let now = 0;
const getPerf = () => globalThis.performance as Performance;

const createAdvance = () => async (ms: number) => {
  now += ms;
  vi.advanceTimersByTime(ms);
  await vi.runOnlyPendingTimersAsync();
};

describe('sound priority and throttling', () => {
  let playSpy: ReturnType<typeof vi.spyOn>;
  let nowSpy: ReturnType<typeof vi.spyOn>;
  let advance: (ms: number) => Promise<void>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetSoundQueues();
    playSpy = vi.spyOn(soundManager, 'play').mockImplementation(() => {});
    now = 0;
    nowSpy = vi.spyOn(getPerf(), 'now').mockImplementation(() => now);
    advance = createAdvance();
  });

  afterEach(() => {
    vi.clearAllTimers();
    resetSoundQueues();
    playSpy.mockRestore();
    nowSpy.mockRestore();
    vi.useRealTimers();
  });

  it('plays only the level sound when xp and level events cluster together', async () => {
    queueAppSound('xp_awarded', 0);
    queueAppSound('level_up', 100);

    await advance(200);

    expect(soundManager.play).toHaveBeenCalledTimes(1);
    expect(soundManager.play).toHaveBeenCalledWith('level-up');
  });

  it('prefers badge sounds over level sounds in the same window', async () => {
    queueAppSound('level_up', 0);
    queueAppSound('badge_award', 80);

    await advance(200);

    expect(soundManager.play).toHaveBeenCalledTimes(1);
    expect(soundManager.play).toHaveBeenCalledWith('badge-award');
  });

  it('plays only the level sound when a quest causes a level up', async () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alice', xp: 90 });
    state = addQuest(state, {
      id: 'q1',
      name: 'Quest',
      xp: 20,
      type: 'repeatable',
      target: 'individual',
      active: true,
    });

    state = awardQuest(state, { questId: 'q1', studentId: 's1' });

    await advance(200);

    expect(soundManager.play).toHaveBeenCalledTimes(1);
    expect(soundManager.play).toHaveBeenCalledWith('level-up');
  });

  it('plays only the badge sound when a quest grants a new badge', async () => {
    let state = createInitialState();
    state = {
      ...state,
      badgeDefs: [
        {
          id: 'total-120',
          name: 'Total XP 120',
          rule: { type: 'total_xp', threshold: 120 },
        },
      ],
    };
    state = addStudent(state, { id: 's1', alias: 'Alice', xp: 110 });
    state = addQuest(state, {
      id: 'q1',
      name: 'Quest',
      xp: 15,
      type: 'repeatable',
      target: 'individual',
      active: true,
    });

    state = awardQuest(state, { questId: 'q1', studentId: 's1' });

    await advance(200);

    expect(soundManager.play).toHaveBeenCalledTimes(1);
    expect(soundManager.play).toHaveBeenCalledWith('badge-award');
  });

  it('throttles repeated xp events while still awarding xp', async () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alice' });
    state = addQuest(state, {
      id: 'q1',
      name: 'Quest',
      xp: 20,
      type: 'repeatable',
      target: 'individual',
      active: true,
    });

    state = awardQuest(state, { questId: 'q1', studentId: 's1' });
    await advance(160);

    now += 10;
    state = awardQuest(state, { questId: 'q1', studentId: 's1' });
    await advance(150);

    const student = state.students.find((s) => s.id === 's1');
    expect(student?.xp).toBe(40);

    const xpSounds = playSpy.mock.calls.filter(([key]) => key === 'xp-grant');
    expect(xpSounds.length).toBe(1);
  });

  it('keeps snapshot and app queues independent with throttle', async () => {
    queueAppSound('xp_awarded', 0);
    queueSnapshotSound('snap_badge', 0);

    await advance(200);

    expect(soundManager.play).toHaveBeenCalledTimes(2);
    expect(soundManager.play).toHaveBeenNthCalledWith(1, 'xp-grant');
    expect(soundManager.play).toHaveBeenNthCalledWith(2, 'badge-award');
  });
});
