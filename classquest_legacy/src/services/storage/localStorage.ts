import type { AppState } from '~/types/models';
import { sanitizeState } from '~/core/schema/appState';
import { migrateState } from '~/core/schema/migrate';

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
  const parsed = JSON.parse(json);
  const clean = sanitizeState(parsed);
  if (!clean) {
    throw new Error('Invalid state payload');
  }
  const migrated = migrateState(clean);
  return migrated as AppState;
};

export class LocalStorageAdapter {
  async saveState(state: AppState): Promise<void> {
    const clean = sanitizeState(state);
    if (!clean) {
      throw new Error('State failed validation; not saved.');
    }
    const payload = JSON.stringify(clean);
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
    const clean = sanitizeState(state);
    if (!clean) {
      throw new Error('State failed validation; cannot export.');
    }
    return JSON.stringify(clean, null, 2);
  }

  async importState(json: string): Promise<AppState> {
    return parseState(json);
  }
}
