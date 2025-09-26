import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const playMock = vi.fn(() => 1);
  const stopMock = vi.fn();
  const volumeMock = vi.fn();
  const rateMock = vi.fn();
  const onMock = vi.fn();
  const howlerVolumeMock = vi.fn();
  const howlerMuteMock = vi.fn();
  const resumeMock = vi.fn().mockResolvedValue(undefined);
  const unloadMock = vi.fn();

  return {
    playMock,
    stopMock,
    volumeMock,
    rateMock,
    onMock,
    howlerVolumeMock,
    howlerMuteMock,
    resumeMock,
    unloadMock,
  };
});

const blobStoreMocks = vi.hoisted(() => ({
  getObjectURL: vi.fn(async (id: string) => `blob://${id}`),
  clearObjectURL: vi.fn(),
}));

vi.mock('howler', () => {
  class MockHowl {
    options: unknown;

    constructor(options: unknown) {
      this.options = options;
    }

    play = mocks.playMock;
    stop = mocks.stopMock;
    volume = mocks.volumeMock;
    rate = mocks.rateMock;
    on = mocks.onMock;
    unload = mocks.unloadMock;
  }

  const Howler = {
    volume: mocks.howlerVolumeMock,
    mute: mocks.howlerMuteMock,
    ctx: { state: 'running' as const, resume: mocks.resumeMock },
  };

  return { Howl: MockHowl, Howler };
});

vi.mock('~/services/blobStore', () => blobStoreMocks);

import { soundManager } from '../SoundManager';

const resetInternals = () => {
  const internals = soundManager as unknown as {
    lastPlay: Map<string, number>;
    cooldowns: Map<string, number>;
    howls: Map<string, { unload: () => void }>;
    overrideSources: Map<string, string[]>;
    overrideBlobIds: Map<string, string>;
    initialized: boolean;
  };
  internals.lastPlay.clear();
  internals.cooldowns.clear();
  internals.howls.clear();
  internals.overrideSources.clear();
  internals.overrideBlobIds.clear();
  internals.initialized = false;
};

describe('SoundManager', () => {
  beforeEach(() => {
    mocks.playMock.mockClear();
    mocks.stopMock.mockClear();
    mocks.volumeMock.mockClear();
    mocks.rateMock.mockClear();
    mocks.onMock.mockClear();
    mocks.unloadMock.mockClear();
    mocks.howlerVolumeMock.mockClear();
    mocks.howlerMuteMock.mockClear();
    blobStoreMocks.getObjectURL.mockClear();
    blobStoreMocks.clearObjectURL.mockClear();
    resetInternals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('respects cooldown for repeated plays', () => {
    let currentTime = 0;
    const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => currentTime);

    soundManager.init();
    expect(soundManager.isMuted()).toBe(false);

    const internals = soundManager as unknown as { howls: Map<string, unknown> };
    expect(internals.howls.has('xp-grant')).toBe(true);

    soundManager.setCooldown('xp-grant', 400);

    soundManager.play('xp-grant');
    expect(mocks.playMock).toHaveBeenCalledTimes(1);

    currentTime += 200;
    soundManager.play('xp-grant');
    expect(mocks.playMock).toHaveBeenCalledTimes(1);

    currentTime += 400;
    soundManager.play('xp-grant');
    expect(mocks.playMock).toHaveBeenCalledTimes(2);

    nowSpy.mockRestore();
  });

  it('sets master volume and mute state', () => {
    soundManager.init();

    soundManager.setVolume(0.5);
    expect(mocks.howlerVolumeMock).toHaveBeenLastCalledWith(0.5);

    soundManager.setMuted(true);
    expect(mocks.howlerMuteMock).toHaveBeenLastCalledWith(true);

    soundManager.setMuted(false);
    expect(mocks.howlerMuteMock).toHaveBeenLastCalledWith(false);

    soundManager.setVolume(2);
    expect(mocks.howlerVolumeMock).toHaveBeenLastCalledWith(1);
  });
});
