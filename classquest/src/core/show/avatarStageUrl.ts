import type { AppState, Student } from '~/types/models';
import { getObjectURL } from '~/services/blobStore';

function sanitizeStageKeys(pack?: Student['avatarPack']): (string | null)[] {
  const raw = Array.isArray(pack?.stageKeys) ? pack?.stageKeys ?? [] : [];
  return raw.map((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  });
}

export async function getAvatarStageUrl(
  state: AppState,
  student: Student,
  stage: number,
): Promise<string | null> {
  if (student.avatarMode !== 'imagePack') {
    return null;
  }
  const keys = sanitizeStageKeys(student.avatarPack);
  if (!keys.length) {
    return null;
  }
  const clamped = Math.max(0, Math.min(stage, keys.length - 1));
  let key = keys[clamped];
  if (!key) {
    for (let index = clamped; index >= 0; index -= 1) {
      const fallback = keys[index];
      if (fallback) {
        key = fallback;
        break;
      }
    }
  }
  if (!key) {
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const fallback = keys[index];
      if (fallback) {
        key = fallback;
        break;
      }
    }
  }
  if (!key) {
    return null;
  }
  try {
    const url = await getObjectURL(key);
    return url ?? null;
  } catch (error) {
    console.warn('Unable to load avatar stage object URL', error);
    return null;
  }
}
