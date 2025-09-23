import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter, STORAGE_KEY } from '~/services/storage/localStorage';
import type { AppState } from '~/types/models';
import { sanitizeState } from '~/core/schema/appState';
import {
  createDefaultAssetSettings,
  createDefaultSnapshotSoundSettings,
  createDefaultSoundSettings,
} from '~/types/settings';

type GlobalWithStorage = typeof globalThis & { localStorage?: Storage };

const ensureLocalStorage = (): Storage => {
  const globalScope = globalThis as GlobalWithStorage;
  if (!globalScope.localStorage) {
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      get length() {
        return store.size;
      },
      clear: () => {
        store.clear();
      },
      getItem: (key) => store.get(key) ?? null,
      key: (index) => Array.from(store.keys())[index] ?? null,
      removeItem: (key) => {
        store.delete(key);
      },
      setItem: (key, value) => {
        store.set(key, value);
      },
    };

    globalScope.localStorage = mockStorage;
  }

  return globalScope.localStorage;
};

const sampleState = (): AppState => ({
  students: [{ id: 's1', alias: 'Lena', xp: 10, level: 1, streaks: {}, lastAwardedDay: {}, badges: [] }],
  teams: [],
  quests: [{ id: 'q1', name: 'Hausaufgaben', xp: 10, type: 'daily', target: 'individual', active: true }],
  categories: [],
  logs: [],
  settings: {
    className: '4a',
    xpPerLevel: 100,
    streakThresholdForBadge: 5,
    allowNegativeXP: false,
    assets: createDefaultAssetSettings(),
    sounds: createDefaultSoundSettings(),
    snapshotSounds: createDefaultSnapshotSoundSettings(),
  },
  version: 1,
  classProgress: { totalXP: 10, stars: 0 },
  badgeDefs: [],
});

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;
  let storage: Storage;

  beforeEach(() => {
    adapter = new LocalStorageAdapter();
    storage = ensureLocalStorage();
    storage.clear();
  });

  it('export -> import roundtrip yields deep-equal state', async () => {
    const s = sampleState();
    const json = await adapter.exportState(s);
    const restored = await adapter.importState(json);
    const expected = sanitizeState(s);
    expect(expected).not.toBeNull();
    expect(restored).toEqual(expected as AppState);
  });

  it('saveState -> loadState roundtrip via localStorage', async () => {
    const s = sampleState();
    await adapter.saveState(s);
    const loaded = await adapter.loadState();
    const expected = sanitizeState(s);
    expect(expected).not.toBeNull();
    expect(loaded).toEqual(expected as AppState);
  });

  it('loadState returns null on corrupt JSON', async () => {
    storage.setItem(STORAGE_KEY, '{bad json');
    const loaded = await adapter.loadState();
    expect(loaded).toBeNull();
  });
});
