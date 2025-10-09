export type WeeklySnapshot = {
  id: string;
  label: string;
  createdAt: string;
  students: Array<{
    id: string;
    alias: string;
    xp: number;
    level: number;
    stage: number;
    badgeIds: string[];
  }>;
};

const STORAGE_KEY = 'weekly:snapshots:v1';

function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('Weekly snapshot storage unavailable', error);
    return null;
  }
}

export function listSnapshots(): WeeklySnapshot[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is WeeklySnapshot => {
      return entry && typeof entry.id === 'string' && Array.isArray(entry.students);
    });
  } catch (error) {
    console.warn('Failed to read weekly snapshots', error);
    return [];
  }
}

export function saveSnapshots(entries: WeeklySnapshot[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('Failed to persist weekly snapshots', error);
  }
}

export function addSnapshot(snapshot: WeeklySnapshot): void {
  const existing = listSnapshots().filter((entry) => entry.id !== snapshot.id);
  existing.unshift(snapshot);
  saveSnapshots(existing.slice(0, 24));
}
