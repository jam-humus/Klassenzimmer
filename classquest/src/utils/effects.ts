import lottie, { type AnimationItem } from 'lottie-web';
import { clearObjectURL, getObjectURL } from '~/services/blobStore';
import type { Settings } from '~/types/models';
import {
  type AssetEvent,
  type AssetRef,
  type AssetSettings,
  cloneAssetSettings,
  createDefaultAssetSettings,
  DEFAULT_AUDIO_COOLDOWN_MS,
  DEFAULT_LOTTIE_COOLDOWN_MS,
} from '~/types/settings';

type LottieOptions = { mount?: HTMLElement; center?: boolean; durationMs?: number };

export type PlayAudioResult = 'played' | 'cooldown' | 'disabled' | 'unavailable';

const clampVolume = (value: number): number => {
  if (!Number.isFinite(value)) return 1;
  if (Number.isNaN(value)) return 1;
  return Math.min(1, Math.max(0, value));
};

const getTimestamp = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const clampCooldownValue = (value: number | undefined, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return Math.max(0, fallback);
  }
  return value < 0 ? 0 : value;
};

const withinCooldown = (lastAt: number | undefined, now: number, cooldownMs: number): boolean =>
  typeof lastAt === 'number' && now - lastAt < cooldownMs;

const resolveBlobKey = (recordId: string, ref: AssetRef | undefined): string | null => {
  const keyCandidate = ref?.key ?? recordId;
  if (typeof keyCandidate !== 'string') return null;
  const trimmed = keyCandidate.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const collectBindingKeys = (bindings: Record<string, string | undefined>, assets: AssetSettings) => {
  const keys = new Set<string>();
  Object.values(bindings).forEach((value) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const candidate = resolveBlobKey(trimmed, assets.library[trimmed]);
    if (candidate) {
      keys.add(candidate);
    }
  });
  return keys;
};

const collectActiveBlobKeys = (assets: AssetSettings): Set<string> => {
  const keys = new Set<string>();
  Object.entries(assets.library).forEach(([recordId, ref]) => {
    const blobKey = resolveBlobKey(recordId, ref);
    if (blobKey) {
      keys.add(blobKey);
    }
  });
  const audioKeys = collectBindingKeys(assets.bindings.audio ?? {}, assets);
  const lottieKeys = collectBindingKeys(assets.bindings.lottie ?? {}, assets);
  const imageKeys = collectBindingKeys(assets.bindings.image ?? {}, assets);
  audioKeys.forEach((key) => keys.add(key));
  lottieKeys.forEach((key) => keys.add(key));
  imageKeys.forEach((key) => keys.add(key));
  return keys;
};

const DEFAULT_ASSETS = createDefaultAssetSettings();

let currentAssets: AssetSettings = cloneAssetSettings(DEFAULT_ASSETS);
let knownBlobKeys = collectActiveBlobKeys(currentAssets);
let blobKeyToAsset = new Map<string, AssetRef>();

const lastAudioAt = new Map<AssetEvent, number>();
const lastLottieAt = new Map<AssetEvent, number>();
const activeLottieByEvent = new Map<AssetEvent, boolean>();
const coalesceTimers = new Map<AssetEvent, number>();

const getCooldownMs = (kind: 'audio' | 'lottie', evt: AssetEvent): number => {
  const cooldown = currentAssets.cooldown;
  if (!cooldown) {
    return kind === 'audio' ? DEFAULT_AUDIO_COOLDOWN_MS : DEFAULT_LOTTIE_COOLDOWN_MS;
  }
  if (kind === 'audio') {
    const specific = cooldown.audioMs?.[evt];
    if (typeof specific === 'number') {
      return clampCooldownValue(specific, cooldown.defaultAudioMs ?? DEFAULT_AUDIO_COOLDOWN_MS);
    }
    return clampCooldownValue(cooldown.defaultAudioMs, DEFAULT_AUDIO_COOLDOWN_MS);
  }
  const specific = cooldown.lottieMs?.[evt];
  if (typeof specific === 'number') {
    return clampCooldownValue(specific, cooldown.defaultLottieMs ?? DEFAULT_LOTTIE_COOLDOWN_MS);
  }
  return clampCooldownValue(cooldown.defaultLottieMs, DEFAULT_LOTTIE_COOLDOWN_MS);
};

const getCoalesceWindowMs = (evt: AssetEvent): number => {
  const value = currentAssets.cooldown?.coalesceWindowMs?.[evt];
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value;
};

const urlPromises = new Map<string, Promise<string | null>>();
const resolvedUrls = new Map<string, string>();

const updateAssetIndex = (assets: AssetSettings) => {
  blobKeyToAsset = new Map();
  Object.entries(assets.library).forEach(([recordId, ref]) => {
    const blobKey = resolveBlobKey(recordId, ref);
    if (blobKey) {
      blobKeyToAsset.set(blobKey, ref);
    }
  });
};

updateAssetIndex(currentAssets);

const purgeCachedAsset = (blobKey: string) => {
  urlPromises.delete(blobKey);
  const hasUrl = resolvedUrls.has(blobKey);
  resolvedUrls.delete(blobKey);
  try {
    if (hasUrl) {
      clearObjectURL(blobKey);
    }
  } catch (error) {
    console.warn('Failed to revoke object URL', error);
  }
};

const fetchAssetUrl = async (blobKey: string): Promise<string | null> => {
  const cached = resolvedUrls.get(blobKey);
  if (cached) return cached;
  const existing = urlPromises.get(blobKey);
  if (existing) {
    return existing;
  }
  const promise = getObjectURL(blobKey)
    .then((url) => {
      if (!url) {
        urlPromises.delete(blobKey);
        resolvedUrls.delete(blobKey);
        return null;
      }
      resolvedUrls.set(blobKey, url);
      return url;
    })
    .catch((error) => {
      console.warn('Failed to load asset', error);
      urlPromises.delete(blobKey);
      resolvedUrls.delete(blobKey);
      return null;
    });
  urlPromises.set(blobKey, promise);
  return promise;
};

const resolveBinding = (
  kind: 'audio' | 'lottie' | 'image',
  evt: AssetEvent,
): { blobKey: string; ref: AssetRef | undefined } | null => {
  const binding = currentAssets.bindings[kind]?.[evt];
  if (!binding) return null;
  const ref = currentAssets.library[binding];
  if (ref && ref.type !== kind) {
    return null;
  }
  const blobKey = resolveBlobKey(binding, ref);
  if (!blobKey) return null;
  return { blobKey, ref };
};

const getAudioConstructor = (): (typeof Audio) | null => {
  if (typeof Audio === 'function') return Audio;
  if (typeof window !== 'undefined') {
    const candidate = (window as typeof window & { Audio?: typeof Audio }).Audio;
    if (typeof candidate === 'function') return candidate;
  }
  return null;
};

const preloadAudio = async (url: string): Promise<void> => {
  const AudioCtor = getAudioConstructor();
  if (!AudioCtor) return;
  await new Promise<void>((resolve) => {
    try {
      const audio = new AudioCtor();
      audio.preload = 'auto';
      const cleanup = () => {
        audio.removeEventListener('canplaythrough', cleanup);
        audio.removeEventListener('error', cleanup);
        resolve();
      };
      audio.addEventListener('canplaythrough', cleanup, { once: true });
      audio.addEventListener('error', cleanup, { once: true });
      audio.src = url;
      // calling load() ensures browsers fetch immediately
      if (typeof audio.load === 'function') {
        try {
          audio.load();
        } catch {
          resolve();
        }
      }
    } catch (error) {
      console.warn('Audio preload failed', error);
      resolve();
    }
  });
};

const preloadImage = async (url: string): Promise<void> => {
  if (typeof Image === 'undefined') return;
  await new Promise<void>((resolve) => {
    const img = new Image();
    const finalize = () => {
      img.onload = null;
      img.onerror = null;
      resolve();
    };
    img.onload = finalize;
    img.onerror = finalize;
    img.src = url;
  });
};

const preloadLottie = async (url: string): Promise<void> => {
  if (typeof fetch !== 'function') return;
  try {
    await fetch(url);
  } catch (error) {
    console.warn('Lottie preload failed', error);
  }
};

const ensureOverlayRoot = (): HTMLDivElement | null => {
  if (typeof document === 'undefined') return null;
  const attribute = 'data-classquest-effects-root';
  let node = document.body.querySelector<HTMLDivElement>(`[${attribute}]`);
  if (node && node.parentElement === document.body) {
    return node;
  }
  node = document.createElement('div');
  node.setAttribute(attribute, '');
  Object.assign(node.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '2147483647',
    overflow: 'visible',
  });
  document.body.appendChild(node);
  return node;
};

const createLottieContainer = (mount: HTMLElement, centered: boolean | undefined): HTMLElement => {
  const container = document.createElement('div');
  container.setAttribute('data-classquest-effect-instance', '');
  container.style.pointerEvents = 'none';

  if (mount.hasAttribute('data-classquest-effects-root')) {
    container.style.position = 'absolute';
    container.style.inset = '0';
    if (centered !== false) {
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
    }
  } else if (centered) {
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.width = '100%';
    container.style.height = '100%';
  }

  mount.appendChild(container);
  return container;
};

const startLottieAnimation = (
  container: HTMLElement,
  url: string,
  durationOverride?: number,
  onFinish?: () => void,
): void => {
  let animation: AnimationItem | null = null;
  let fallbackTimer: number | undefined;
  let disposed = false;

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = undefined;
    }
    try {
      animation?.removeEventListener?.('complete', cleanup);
      animation?.removeEventListener?.('destroy', cleanup);
    } catch (error) {
      console.warn('Failed to detach lottie listeners', error);
    }
    try {
      animation?.destroy?.();
    } catch (error) {
      console.warn('Failed to destroy lottie animation', error);
    }
    container.remove();
    try {
      onFinish?.();
    } catch (error) {
      console.warn('Failed to finalize lottie animation', error);
    }
  };

  const scheduleFallback = (duration: number) => {
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
    }
    fallbackTimer = window.setTimeout(cleanup, duration);
  };

  try {
    animation = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      path: url,
      rendererSettings: {
        preserveAspectRatio: 'xMidYMid meet',
      },
    });
    animation.addEventListener('complete', cleanup);
    animation.addEventListener('destroy', cleanup);
    if (durationOverride != null) {
      scheduleFallback(Math.max(0, durationOverride));
    } else {
      animation.addEventListener('data_ready', () => {
        try {
          const total = animation?.getDuration(true) ?? 0;
          const fallback = total > 0 ? total * 1000 + 250 : 1800;
          scheduleFallback(fallback);
        } catch (error) {
          console.warn('Failed to determine lottie duration', error);
          scheduleFallback(2000);
        }
      });
      scheduleFallback(2500);
    }
  } catch (error) {
    console.warn('Failed to load lottie animation', error);
    cleanup();
  }
};

export const setEffectsSettings = (settings: Settings | null | undefined): void => {
  const assets = settings?.assets ? cloneAssetSettings(settings.assets) : cloneAssetSettings(DEFAULT_ASSETS);
  const activeKeys = collectActiveBlobKeys(assets);
  knownBlobKeys.forEach((key) => {
    if (!activeKeys.has(key)) {
      purgeCachedAsset(key);
    }
  });
  knownBlobKeys = activeKeys;
  currentAssets = assets;
  updateAssetIndex(assets);
  if (typeof window !== 'undefined') {
    coalesceTimers.forEach((id) => window.clearTimeout(id));
  }
  coalesceTimers.clear();
  activeLottieByEvent.clear();
};

export function playEventAudio(evt: AssetEvent): PlayAudioResult {
  if (typeof window === 'undefined') return 'disabled';
  if (!currentAssets.audio.enabled) return 'disabled';
  const now = getTimestamp();
  const cooldownMs = getCooldownMs('audio', evt);
  if (withinCooldown(lastAudioAt.get(evt), now, cooldownMs)) return 'cooldown';
  const binding = resolveBinding('audio', evt);
  if (!binding) return 'unavailable';
  const volume = clampVolume(currentAssets.audio.masterVolume ?? 1);
  if (volume <= 0) return 'disabled';
  const AudioCtor = getAudioConstructor();
  if (!AudioCtor) return 'disabled';
  lastAudioAt.set(evt, now);
  void fetchAssetUrl(binding.blobKey)
    .then((url) => {
      if (!url) return;
      try {
        const audio = new AudioCtor(url);
        audio.volume = volume;
        void audio.play().catch((error: unknown) => {
          console.warn('Failed to play audio asset', error);
        });
      } catch (error) {
        console.warn('Unable to instantiate audio', error);
      }
    })
    .catch((error) => {
      console.warn('Failed to load audio asset', error);
    });
  return 'played';
}

export function triggerEventLottie(evt: AssetEvent, opts?: LottieOptions): void {
  if (typeof window === 'undefined') return;
  const animations = currentAssets.animations;
  if (!animations.enabled || animations.preferReducedMotion) {
    return;
  }
  const now = getTimestamp();
  const cooldownMs = getCooldownMs('lottie', evt);
  if (withinCooldown(lastLottieAt.get(evt), now, cooldownMs)) return;
  if (activeLottieByEvent.get(evt)) return;
  const binding = resolveBinding('lottie', evt);
  if (!binding) return;
  lastLottieAt.set(evt, now);
  activeLottieByEvent.set(evt, true);
  void fetchAssetUrl(binding.blobKey)
    .then((url) => {
      if (!url) {
        activeLottieByEvent.delete(evt);
        return;
      }
      const mount = opts?.mount ?? ensureOverlayRoot();
      if (!mount) {
        activeLottieByEvent.delete(evt);
        return;
      }
      const container = createLottieContainer(mount, opts?.center);
      startLottieAnimation(container, url, opts?.durationMs, () => {
        activeLottieByEvent.delete(evt);
      });
    })
    .catch((error) => {
      activeLottieByEvent.delete(evt);
      console.warn('Failed to load lottie asset', error);
    });
}

export function playXpAwardedEffectsCoalesced(): void {
  const evt: AssetEvent = 'xp_awarded';
  const windowMs = getCoalesceWindowMs(evt);
  if (windowMs <= 0 || typeof window === 'undefined') {
    playEventAudio(evt);
    triggerEventLottie(evt, { center: true, durationMs: 900 });
    return;
  }
  const existing = coalesceTimers.get(evt);
  if (existing != null) {
    window.clearTimeout(existing);
  }
  const timeoutId = window.setTimeout(() => {
    playEventAudio(evt);
    triggerEventLottie(evt, { center: true, durationMs: 900 });
    coalesceTimers.delete(evt);
  }, windowMs);
  coalesceTimers.set(evt, timeoutId);
}

export async function preloadAssets(): Promise<void> {
  const keys = Array.from(collectActiveBlobKeys(currentAssets));
  if (!keys.length) return;
  await Promise.all(
    keys.map(async (blobKey) => {
      const url = await fetchAssetUrl(blobKey);
      if (!url) return;
      const ref = blobKeyToAsset.get(blobKey);
      try {
        if (ref?.type === 'audio') {
          await preloadAudio(url);
        } else if (ref?.type === 'image') {
          await preloadImage(url);
        } else if (ref?.type === 'lottie') {
          await preloadLottie(url);
        }
      } catch (error) {
        console.warn('Failed to preload asset', error);
      }
    }),
  );
}
