import type { AppState } from '~/types/models';
import { LocalStorageAdapter } from './localStorage';

export interface StorageAdapter {
  loadState(): Promise<AppState | null>;
  saveState(state: AppState): Promise<void>;
  exportState(state: AppState): Promise<string>;
  importState(json: string): Promise<AppState>;
}

export function createStorageAdapter(): StorageAdapter {
  return new LocalStorageAdapter();
}
