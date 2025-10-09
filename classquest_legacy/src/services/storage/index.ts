import { LocalStorageAdapter } from './localStorage';

export type StorageAdapter = LocalStorageAdapter;

export const createStorageAdapter = () => new LocalStorageAdapter();
