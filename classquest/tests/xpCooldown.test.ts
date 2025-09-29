import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addQuest,
  addStudent,
  awardQuest,
  createInitialState,
  resetXpAwardCooldown,
} from '~/core/state';
import type { AppState } from '~/types/models';
import { soundManager } from '~/audio/SoundManager';
import { resetSoundQueues } from '~/audio/soundQueue';

const advance = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await vi.runOnlyPendingTimersAsync();
};

const baseQuest = {
  id: 'q1',
  name: 'Quest',
  xp: 50,
  type: 'repeatable' as const,
  target: 'individual' as const,
  active: true,
};

describe('xp award cooldown', () => {
  let state: AppState;
  let now = 0;
  let nowSpy: ReturnType<typeof vi.spyOn>;
  let playSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    resetSoundQueues();
    resetXpAwardCooldown();
    playSpy = vi.spyOn(soundManager, 'play').mockImplementation(() => {});
    now = 0;
    nowSpy = vi
      .spyOn(globalThis.performance, 'now')
      .mockImplementation(() => now);
    state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alice' });
    state = addQuest(state, baseQuest);
  });

  afterEach(() => {
    vi.clearAllTimers();
    resetSoundQueues();
    resetXpAwardCooldown();
    nowSpy.mockRestore();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('allows only one award within the cooldown window', async () => {
    state = awardQuest(state, { questId: baseQuest.id, studentId: 's1' });
    await advance(200);

    expect(state.students[0].xp).toBe(baseQuest.xp);
    expect(playSpy).toHaveBeenCalledTimes(1);

    now = 200;
    state = awardQuest(state, { questId: baseQuest.id, studentId: 's1' });
    await advance(200);

    expect(state.students[0].xp).toBe(baseQuest.xp);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('allows awarding again after the cooldown elapsed', async () => {
    state = awardQuest(state, { questId: baseQuest.id, studentId: 's1' });
    await advance(200);

    now = 400;
    state = awardQuest(state, { questId: baseQuest.id, studentId: 's1' });
    await advance(200);

    expect(state.students[0].xp).toBe(baseQuest.xp * 2);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it('awards multiple students independently', async () => {
    state = addStudent(state, { id: 's2', alias: 'Bob' });

    state = awardQuest(state, { questId: baseQuest.id, studentId: 's1' });
    state = awardQuest(state, { questId: baseQuest.id, studentId: 's2' });
    await advance(200);

    const xpById = new Map(state.students.map((s) => [s.id, s.xp]));
    expect(xpById.get('s1')).toBe(baseQuest.xp);
    expect(xpById.get('s2')).toBe(baseQuest.xp);
  });

  it('honours disabled cooldown settings', async () => {
    state = createInitialState({ xpAwardCooldownMs: 0 });
    state = addStudent(state, { id: 's1', alias: 'Alice' });
    state = addQuest(state, baseQuest);

    state = awardQuest(state, { questId: baseQuest.id, studentId: 's1' });
    await advance(200);

    state = awardQuest(state, { questId: baseQuest.id, studentId: 's1' });
    await advance(200);

    expect(state.students[0].xp).toBe(baseQuest.xp * 2);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it('does not play sounds when an award is blocked by the cooldown', async () => {
    state = awardQuest(state, { questId: baseQuest.id, studentId: 's1' });
    await advance(200);

    playSpy.mockClear();

    now = 250;
    state = awardQuest(state, { questId: baseQuest.id, studentId: 's1' });
    await advance(200);

    expect(state.students[0].xp).toBe(baseQuest.xp);
    expect(playSpy).not.toHaveBeenCalled();
  });
});
