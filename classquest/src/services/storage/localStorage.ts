import type { AppState } from '~/types/models';

export const STORAGE_KEY = 'classquest:state';

const getStorage = (): Storage => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  const storage = (globalThis as { localStorage?: Storage }).localStorage;
  if (storage) return storage;

  throw new Error('localStorage is not available');
};

const parseState = (json: string): AppState => {
  const parsed = JSON.parse(json) as AppState | null;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid state payload');
  }
  return parsed;
};

export class LocalStorageAdapter {
  async saveState(state: AppState): Promise<void> {
    const payload = JSON.stringify(state);
    getStorage().setItem(STORAGE_KEY, payload);
  }

  async loadState(): Promise<AppState | null> {
    const storage = getStorage();
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      return parseState(raw);
    } catch (error) {
      console.warn('Failed to parse stored state', error);
      return null;
    }
  }

  async exportState(state: AppState): Promise<string> {
    return JSON.stringify(state);
  }

  async importState(json: string): Promise<AppState> {
    return parseState(json);
  }
}
