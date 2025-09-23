import type { Settings } from '~/types/models';
import type {
  AppSoundEvent,
  SnapshotSoundEvent,
  SnapshotSoundSettings,
  SoundSettings,
} from '~/types/settings';
import {
  cloneSnapshotSoundSettings,
  cloneSoundSettings,
  createDefaultSnapshotSoundSettings,
  createDefaultSoundSettings,
} from '~/types/settings';
import { blobStore } from '~/utils/blobStore';

const urlCache = new Map<string, string>();
const pendingUrls = new Map<string, Promise<string | null>>();
const assetKeyIndex = new Map<string, string>();
const lastAtApp = new Map<AppSoundEvent, number>();
const lastAtSnap = new Map<SnapshotSoundEvent, number>();

let appCfg: SoundSettings = createDefaultSoundSettings();
let snapCfg: SnapshotSoundSettings = createDefaultSnapshotSoundSettings();

const APP_EVENT_COOLDOWN_MS = 200;

const getNow = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const normalizeKey = (key?: string | null): string | undefined => {
  if (typeof key !== 'string') return undefined;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveBindingKey = (binding?: string | null): string | undefined => {
  const normalized = normalizeKey(binding);
  if (!normalized) return undefined;
  return assetKeyIndex.get(normalized) ?? normalized;
};

const fetchUrlForKey = async (key: string): Promise<string | null> => {
  const cached = urlCache.get(key);
  if (cached) return cached;
  const pending = pendingUrls.get(key);
  if (pending) return pending;
  const promise = blobStore
    .getObjectUrl(key)
    .then((url) => {
      if (url) {
        urlCache.set(key, url);
        return url;
      }
      urlCache.delete(key);
      return null;
    })
    .finally(() => {
      pendingUrls.delete(key);
    });
  pendingUrls.set(key, promise);
  return promise;
};

const preloadAudio = async (url: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  const AudioCtor = typeof Audio === 'function' ? Audio : undefined;
  if (!AudioCtor) return;
  await new Promise<void>((resolve) => {
    try {
      const audio = new AudioCtor();
      audio.preload = 'auto';
      const finalize = () => {
        audio.removeEventListener('canplaythrough', finalize);
        audio.removeEventListener('error', finalize);
        resolve();
      };
      audio.addEventListener('canplaythrough', finalize, { once: true });
      audio.addEventListener('error', finalize, { once: true });
      audio.src = url;
      if (typeof audio.load === 'function') {
        try {
          audio.load();
        } catch {
          resolve();
        }
      }
    } catch {
      resolve();
    }
  });
};

const beep = (vol = 1) => {
  if (typeof window === 'undefined') return;
  const Ctor =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (typeof Ctor !== 'function') return;
  try {
    const ctx = new Ctor();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = Math.max(0, Math.min(1, vol)) * 0.1;
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      ctx.close().catch(() => undefined);
    }, 120);
  } catch (error) {
    console.warn('Snapshot beep failed', error);
  }
};

const playByKey = async (binding: string | undefined, volume = 1): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  const resolvedKey = resolveBindingKey(binding);
  if (!resolvedKey) return false;
  const url = await fetchUrlForKey(resolvedKey);
  if (!url) return false;
  const AudioCtor = typeof Audio === 'function' ? Audio : undefined;
  if (!AudioCtor) return false;
  try {
    const audio = new AudioCtor(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    await audio.play();
    return true;
  } catch (error) {
    console.warn('Failed to play snapshot sound', error);
    return false;
  }
};

const collectBindingKeys = (bindings: Partial<Record<string, string | undefined>>): string[] => {
  const result: string[] = [];
  Object.values(bindings).forEach((binding) => {
    const resolved = resolveBindingKey(binding);
    if (resolved) {
      result.push(resolved);
    }
  });
  return result;
};

const updateAssetIndex = (settings: Settings | null | undefined) => {
  assetKeyIndex.clear();
  const library = settings?.assets?.library ?? {};
  Object.entries(library).forEach(([id, ref]) => {
    if (!ref) return;
    const key = normalizeKey(ref.key) ?? normalizeKey(id);
    if (!key) return;
    assetKeyIndex.set(id, key);
    assetKeyIndex.set(key, key);
  });
};

export function setSoundSettings(settings: Settings | null | undefined): void {
  appCfg = cloneSoundSettings(settings?.sounds);
  snapCfg = cloneSnapshotSoundSettings(settings?.snapshotSounds);
  updateAssetIndex(settings);
  lastAtApp.clear();
  lastAtSnap.clear();
}

export async function preloadSounds(): Promise<void> {
  const keys = new Set<string>();
  collectBindingKeys(appCfg.bindings ?? {}).forEach((key) => keys.add(key));
  collectBindingKeys(snapCfg.bindings ?? {}).forEach((key) => keys.add(key));
  if (!keys.size) return;
  await Promise.all(
    Array.from(keys).map(async (key) => {
      const url = await fetchUrlForKey(key);
      if (!url) return;
      await preloadAudio(url);
    }),
  );
}

export async function playSound(evt: AppSoundEvent): Promise<void> {
  if (!appCfg.enabled) return;
  const now = getNow();
  if ((lastAtApp.get(evt) ?? 0) > now - APP_EVENT_COOLDOWN_MS) return;
  const key = appCfg.bindings?.[evt];
  const played = await playByKey(key, appCfg.masterVolume);
  if (!played && appCfg.useFallbackBeep) {
    beep(appCfg.masterVolume);
  }
  lastAtApp.set(evt, now);
}

export async function playSnapshotSound(evt: SnapshotSoundEvent): Promise<void> {
  if (!snapCfg.enabled) return;
  const now = getNow();
  const cooldown = snapCfg.cooldownMs?.[evt] ?? APP_EVENT_COOLDOWN_MS;
  if ((lastAtSnap.get(evt) ?? 0) > now - cooldown) return;
  const key = snapCfg.bindings?.[evt];
  await playByKey(key, snapCfg.volume);
  lastAtSnap.set(evt, now);
}
