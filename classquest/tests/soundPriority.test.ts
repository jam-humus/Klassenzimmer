import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queueAppSound, queueSnapshotSound, resetSoundQueues } from '~/audio/soundQueue';
import { soundManager } from '~/audio/SoundManager';

const advance = async (ms: number) => {
  vi.advanceTimersByTime(ms);
  await vi.runOnlyPendingTimersAsync();
};

describe('sound prioritization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSoundQueues();
    vi.spyOn(soundManager, 'play').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
    resetSoundQueues();
    vi.restoreAllMocks();
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

  it('plays xp sound when no higher priority event occurs', async () => {
    queueAppSound('xp_awarded', 0);

    await advance(200);

    expect(soundManager.play).toHaveBeenCalledTimes(1);
    expect(soundManager.play).toHaveBeenCalledWith('xp-grant');
  });

  it('prioritizes snapshot badge sounds over other snapshot events', async () => {
    queueSnapshotSound('snap_xp', 0);
    queueSnapshotSound('snap_level', 40);
    queueSnapshotSound('snap_badge', 80);

    await advance(200);

    expect(soundManager.play).toHaveBeenCalledTimes(1);
    expect(soundManager.play).toHaveBeenCalledWith('badge-award');
  });

  it('maintains independent windows for app and snapshot queues', async () => {
    queueAppSound('xp_awarded', 0);
    queueSnapshotSound('snap_badge', 0);

    await advance(200);

    expect(soundManager.play).toHaveBeenCalledTimes(2);
    expect(soundManager.play).toHaveBeenNthCalledWith(1, 'xp-grant');
    expect(soundManager.play).toHaveBeenNthCalledWith(2, 'badge-award');
  });
});
