const DB_NAME = 'classquest-blobs';
const STORE_NAME = 'images';

const memoryStore = new Map<string, Blob>();
const urlCache = new Map<string, string>();

let useMemoryStore = false;
let dbPromise: Promise<IDBDatabase | null> | null = null;

const createId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function ensureMemoryStore() {
  useMemoryStore = true;
  return memoryStore;
}

async function getDatabase(): Promise<IDBDatabase | null> {
  if (useMemoryStore) {
    return null;
  }

  if (typeof indexedDB === 'undefined' || indexedDB === null) {
    ensureMemoryStore();
    return null;
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          db.onclose = () => {
            // When the database closes unexpectedly we fall back to the memory store to stay functional.
            ensureMemoryStore();
          };
          resolve(db);
        };
        request.onerror = () => {
          console.warn('IndexedDB (blob store) unavailable, falling back to memory store.', request.error);
          resolve(null);
        };
        request.onblocked = () => {
          console.warn('IndexedDB (blob store) open blocked, using memory store as fallback.');
          resolve(null);
        };
      } catch (error) {
        console.warn('IndexedDB (blob store) init failed, using memory store.', error);
        resolve(null);
      }
    }).then((db) => {
      if (!db) {
        ensureMemoryStore();
      }
      return db;
    });
  }

  const db = await dbPromise;
  if (!db) {
    ensureMemoryStore();
  }
  return db;
}

function runTransaction(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    try {
      executor(store);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  });
}

function cacheUrl(id: string, blob: Blob) {
  const existing = urlCache.get(id);
  if (existing) {
    try {
      URL.revokeObjectURL(existing);
    } catch (error) {
      console.warn('Failed to revoke object URL', error);
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
  } catch (error) {
    console.warn('Unable to create object URL', error);
  }
}

function revokeCachedUrl(id: string) {
  const url = urlCache.get(id);
  if (!url) return;
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn('Failed to revoke object URL', error);
  }
  urlCache.delete(id);
}

export async function putBlob(file: Blob, id?: string): Promise<string> {
  const trimmed = typeof id === 'string' ? id.trim() : '';
  const recordId = trimmed.length > 0 ? trimmed : createId();
  const db = await getDatabase();

  if (db) {
    try {
      await runTransaction(db, 'readwrite', (store) => {
        store.put(file, recordId);
      });
    } catch (error) {
      console.warn('IndexedDB put failed, switching to memory store.', error);
      ensureMemoryStore();
      memoryStore.set(recordId, file);
    }
  } else {
    memoryStore.set(recordId, file);
  }

  cacheUrl(recordId, file);
  return recordId;
}

export async function getBlob(id: string): Promise<Blob | null> {
  if (!id) return null;

  if (useMemoryStore) {
    return memoryStore.get(id) ?? null;
  }

  const db = await getDatabase();
  if (!db) {
    return memoryStore.get(id) ?? null;
  }

  return await new Promise<Blob | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      const value = request.result;
      resolve(value instanceof Blob ? value : null);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB get failed'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    };
  }).catch((error) => {
    console.warn('IndexedDB get failed, attempting memory store fallback.', error);
    ensureMemoryStore();
    return memoryStore.get(id) ?? null;
  });
}

export async function deleteBlob(id: string): Promise<void> {
  if (!id) return;

  let deletedFromDb = false;
  const db = await getDatabase();
  if (db) {
    try {
      await runTransaction(db, 'readwrite', (store) => {
        store.delete(id);
      });
      deletedFromDb = true;
    } catch (error) {
      console.warn('IndexedDB delete failed, using memory store fallback.', error);
      ensureMemoryStore();
    }
  }

  if (!deletedFromDb || useMemoryStore) {
    memoryStore.delete(id);
  }

  revokeCachedUrl(id);
}

export async function getObjectURL(id: string): Promise<string | null> {
  if (!id) return null;
  const cached = urlCache.get(id);
  if (cached) return cached;

  const blob = await getBlob(id);
  if (!blob) return null;

  try {
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  } catch (error) {
    console.warn('Unable to create object URL', error);
    return null;
  }
}

export function clearObjectURL(id: string) {
  revokeCachedUrl(id);
}
