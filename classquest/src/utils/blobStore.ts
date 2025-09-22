import { deleteBlob, getObjectURL, putBlob } from '~/services/blobStore';

const normalizeKey = (key?: string | null): string | undefined => {
  if (typeof key !== 'string') {
    return undefined;
  }
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

async function put(key: string | null | undefined, file: Blob): Promise<string> {
  const storedKey = await putBlob(file, normalizeKey(key));
  return storedKey;
}

async function remove(key: string): Promise<void> {
  if (!key) return;
  await deleteBlob(key);
}

export const blobStore = {
  put,
  getObjectUrl: getObjectURL,
  remove,
};

export type BlobStore = typeof blobStore;
