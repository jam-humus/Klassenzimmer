import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteBlob, getBlob, getObjectURL, putBlob } from './indexedDb';

describe('indexedDb blob store', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let counter = 0;
  const revokeMock = vi.fn();

  beforeEach(() => {
    counter = 0;
    (URL.createObjectURL as unknown as (blob: Blob) => string) = () => `blob:test-${counter++}`;
    (URL.revokeObjectURL as unknown as (url: string) => void) = revokeMock;
    revokeMock.mockReset();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  });

  it('stores, reads and deletes blobs', async () => {
    const blob = new Blob(['hello'], { type: 'image/png' });
    const id = await putBlob(blob);
    expect(typeof id).toBe('string');

    const stored = await getBlob(id);
    expect(stored).not.toBeNull();
    expect(await stored!.text()).toBe('hello');

    const url = await getObjectURL(id);
    expect(url).toBe('blob:test-0');
    const cachedAgain = await getObjectURL(id);
    expect(cachedAgain).toBe(url);

    await deleteBlob(id);
    expect(await getBlob(id)).toBeNull();
    expect(await getObjectURL(id)).toBeNull();
    expect(revokeMock).toHaveBeenCalledWith(url);
  });
});
