import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playSound, setSoundSettings } from '~/utils/sounds';
import { DEFAULT_SETTINGS } from '~/core/config';
import { createDefaultAssetSettings, createDefaultSoundSettings } from '~/types/settings';

const urlStore = new Map<string, string>();

vi.mock('~/utils/blobStore', () => ({
  blobStore: {
    getObjectUrl: vi.fn((key: string) => Promise.resolve(urlStore.get(key) ?? null)),
    put: vi.fn(),
    remove: vi.fn(),
  },
}));

class MockAudio {
  static instances: MockAudio[] = [];
  public volume = 1;
  public readonly play = vi.fn(async () => undefined);
  constructor(public readonly src: string) {
    MockAudio.instances.push(this);
  }
}

const originalAudio = globalThis.Audio;
const originalPerformance = globalThis.performance;

const buildSettings = () => {
  const assets = createDefaultAssetSettings();
  assets.library = {
    xp: { key: 'key-xp', type: 'audio', name: 'XP', createdAt: 0 },
    level: { key: 'key-level', type: 'audio', name: 'Level', createdAt: 0 },
    badge: { key: 'key-badge', type: 'audio', name: 'Badge', createdAt: 0 },
    showcase: { key: 'key-showcase', type: 'audio', name: 'Showcase', createdAt: 0 },
  };
  const sounds = createDefaultSoundSettings();
  sounds.enabled = true;
  sounds.masterVolume = 0.6;
  sounds.bindings = {
    xp_awarded: 'xp',
    level_up: 'level',
    badge_award: 'badge',
    showcase_start: 'showcase',
  };
  return {
    ...DEFAULT_SETTINGS,
    assets,
    sounds,
  };
};

describe('playSound', () => {
  beforeEach(() => {
    urlStore.clear();
    MockAudio.instances = [];
    globalThis.Audio = MockAudio as unknown as typeof Audio;
    const times: Record<string, number> = {};
    globalThis.performance = {
      now: vi.fn(() => {
        times.default = (times.default ?? 0) + 250;
        return times.default;
      }),
    } as Performance;
    setSoundSettings(null);
  });

  afterEach(() => {
    if (originalAudio) {
      globalThis.Audio = originalAudio;
    } else {
      // @ts-expect-error allow cleanup in tests
      delete (globalThis as typeof globalThis & { Audio?: typeof Audio }).Audio;
    }
    if (originalPerformance) {
      globalThis.performance = originalPerformance;
    } else {
      // @ts-expect-error allow cleanup in tests
      delete (globalThis as typeof globalThis & { performance?: Performance }).performance;
    }
  });

  it('plays assigned audio for each supported event', async () => {
    const settings = buildSettings();
    urlStore.set('key-xp', 'https://cdn.test/xp.mp3');
    urlStore.set('key-level', 'https://cdn.test/level.mp3');
    urlStore.set('key-badge', 'https://cdn.test/badge.mp3');
    urlStore.set('key-showcase', 'https://cdn.test/showcase.mp3');
    setSoundSettings(settings);

    await playSound('xp_awarded');
    await playSound('level_up');
    await playSound('badge_award');
    await playSound('showcase_start');

    expect(MockAudio.instances).toHaveLength(4);
    expect(MockAudio.instances[0].src).toBe('https://cdn.test/xp.mp3');
    expect(MockAudio.instances[0].volume).toBeCloseTo(0.6);
    expect(MockAudio.instances[1].src).toBe('https://cdn.test/level.mp3');
    expect(MockAudio.instances[2].src).toBe('https://cdn.test/badge.mp3');
    expect(MockAudio.instances[3].src).toBe('https://cdn.test/showcase.mp3');
  });

  it('stays silent when no binding exists', async () => {
    const settings = buildSettings();
    settings.sounds.bindings = {};
    setSoundSettings(settings);

    await playSound('level_up');

    expect(MockAudio.instances).toHaveLength(0);
  });

  it('respects cooldown for rapid xp events', async () => {
    const settings = buildSettings();
    urlStore.set('key-xp', 'https://cdn.test/xp.mp3');
    setSoundSettings(settings);

    let current = 1000;
    globalThis.performance = {
      now: vi.fn(() => current),
    } as Performance;

    await playSound('xp_awarded');
    expect(MockAudio.instances).toHaveLength(1);

    current += 100;
    await playSound('xp_awarded');
    expect(MockAudio.instances).toHaveLength(1);

    current += 300;
    await playSound('xp_awarded');
    expect(MockAudio.instances).toHaveLength(2);
  });
});
