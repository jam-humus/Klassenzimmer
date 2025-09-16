import type { AppState } from '~/types/models';

const KEY = 'classquest_state_v1';

export class LocalStorageAdapter {
  loadState(): Promise<AppState | null> {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return Promise.resolve(null);
    }

    try {
      return Promise.resolve(JSON.parse(raw) as AppState);
    } catch (error) {
      // Robustes Fallback: State verwerfen, UI kann Onboarding oder Import anbieten
      console.error('Corrupt state in LocalStorage', error);
      return Promise.resolve(null);
    }
  }

  saveState(state: AppState): Promise<void> {
    localStorage.setItem(KEY, JSON.stringify(state));
    return Promise.resolve();
  }

  exportState(state: AppState): Promise<string> {
    return Promise.resolve(JSON.stringify(state, null, 2));
  }

  importState(json: string): Promise<AppState> {
    return Promise.resolve(JSON.parse(json) as AppState);
  }
}
