export type AssetEvent =
  | 'xp_awarded'
  | 'badge_award'
  | 'level_up'
  | 'class_milestone'
  | 'quest_completed'
  | 'student_select'
  | 'avatar_zoom'
  | 'weekly_showcase_start'
  | 'weekly_showcase_end'
  | 'ui_click'
  | 'ui_success'
  | 'ui_error'
  | 'undo'
  | 'redo'
  | 'import_success'
  | 'export_success';

export type AssetKind = 'audio' | 'lottie' | 'image';

export interface AssetRef {
  key: string;
  type: AssetKind;
  name: string;
  createdAt: number;
}

export type AssetBindingMap = Partial<Record<AssetEvent, string>>;

export type AssetCooldownMap = Partial<Record<AssetEvent, number>>;

export interface AssetCooldownSettings {
  audioMs?: AssetCooldownMap;
  lottieMs?: AssetCooldownMap;
  defaultAudioMs?: number;
  defaultLottieMs?: number;
  coalesceWindowMs?: AssetCooldownMap;
}

export const DEFAULT_AUDIO_COOLDOWN_MS = 250;
export const DEFAULT_LOTTIE_COOLDOWN_MS = 600;
export const DEFAULT_XP_COALESCE_WINDOW_MS = 300;

const DEFAULT_COALESCE_WINDOW_MAP: Readonly<AssetCooldownMap> = Object.freeze({
  xp_awarded: DEFAULT_XP_COALESCE_WINDOW_MS,
});

const createDefaultCooldownSettings = (): AssetCooldownSettings => ({
  audioMs: {},
  lottieMs: {},
  defaultAudioMs: DEFAULT_AUDIO_COOLDOWN_MS,
  defaultLottieMs: DEFAULT_LOTTIE_COOLDOWN_MS,
  coalesceWindowMs: { ...DEFAULT_COALESCE_WINDOW_MAP },
});

const cloneCooldownSettings = (settings: AssetCooldownSettings | undefined): AssetCooldownSettings => {
  const defaults = createDefaultCooldownSettings();
  const audioMs = settings?.audioMs ? { ...settings.audioMs } : {};
  const lottieMs = settings?.lottieMs ? { ...settings.lottieMs } : {};
  const coalesceWindowMs = settings?.coalesceWindowMs
    ? { ...settings.coalesceWindowMs }
    : { ...(defaults.coalesceWindowMs ?? {}) };
  return {
    audioMs,
    lottieMs,
    coalesceWindowMs,
    defaultAudioMs: clampNonNegative(settings?.defaultAudioMs, defaults.defaultAudioMs ?? DEFAULT_AUDIO_COOLDOWN_MS),
    defaultLottieMs: clampNonNegative(
      settings?.defaultLottieMs,
      defaults.defaultLottieMs ?? DEFAULT_LOTTIE_COOLDOWN_MS,
    ),
  } satisfies AssetCooldownSettings;
};

export interface AssetSettings {
  library: Record<string, AssetRef>;
  bindings: {
    audio: AssetBindingMap;
    lottie: AssetBindingMap;
    image: AssetBindingMap;
  };
  audio: { masterVolume: number; enabled: boolean };
  animations: { enabled: boolean; preferReducedMotion: boolean };
  cooldown: AssetCooldownSettings;
}

export const DEFAULT_ASSET_SETTINGS: Readonly<AssetSettings> = Object.freeze({
  library: {},
  bindings: {
    audio: {},
    lottie: {},
    image: {},
  },
  audio: { masterVolume: 1, enabled: true },
  animations: { enabled: true, preferReducedMotion: false },
  cooldown: createDefaultCooldownSettings(),
});

export const createDefaultAssetSettings = (): AssetSettings => ({
  library: {},
  bindings: {
    audio: {},
    lottie: {},
    image: {},
  },
  audio: { masterVolume: 1, enabled: true },
  animations: { enabled: true, preferReducedMotion: false },
  cooldown: createDefaultCooldownSettings(),
});

export const cloneAssetSettings = (settings: AssetSettings): AssetSettings => ({
  library: Object.fromEntries(
    Object.entries(settings.library ?? {}).map(([id, ref]) => [
      id,
      {
        key: ref.key,
        type: ref.type,
        name: ref.name,
        createdAt: ref.createdAt,
      },
    ]),
  ),
  bindings: {
    audio: { ...(settings.bindings?.audio ?? {}) },
    lottie: { ...(settings.bindings?.lottie ?? {}) },
    image: { ...(settings.bindings?.image ?? {}) },
  },
  audio: {
    masterVolume: settings.audio?.masterVolume ?? 1,
    enabled: settings.audio?.enabled ?? true,
  },
  animations: {
    enabled: settings.animations?.enabled ?? true,
    preferReducedMotion: settings.animations?.preferReducedMotion ?? false,
  },
  cooldown: cloneCooldownSettings(settings.cooldown),
});

const VALID_ASSET_KINDS: AssetKind[] = ['audio', 'lottie', 'image'];

const asAssetKind = (value: unknown): AssetKind | null =>
  typeof value === 'string' && (VALID_ASSET_KINDS as readonly string[]).includes(value)
    ? (value as AssetKind)
    : null;

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const clamp01 = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
};

const clampNonNegative = (value: number | null | undefined, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return Math.max(0, fallback);
  }
  return value < 0 ? 0 : value;
};

const sanitizeAssetRef = (value: unknown): AssetRef | null => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const key = asString(record.key);
  const type = asAssetKind(record.type);
  const name = asString(record.name) ?? 'Asset';
  const createdAt = asNumber(record.createdAt) ?? Date.now();
  if (!key || !type) return null;
  return { key, type, name, createdAt } satisfies AssetRef;
};

const sanitizeAssetBindingMap = (value: unknown): AssetBindingMap => {
  if (typeof value !== 'object' || value === null) return {};
  const entries = Object.entries(value)
    .map(([event, asset]) => {
      if (typeof asset !== 'string') return null;
      const trimmed = asset.trim();
      if (!trimmed) return null;
      return [event as AssetEvent, trimmed] as const;
    })
    .filter(Boolean) as [AssetEvent, string][];
  return Object.fromEntries(entries);
};

const sanitizeCooldownMap = (value: unknown): AssetCooldownMap => {
  if (typeof value !== 'object' || value === null) return {};
  const result: AssetCooldownMap = {};
  Object.entries(value as Record<string, unknown>).forEach(([event, candidate]) => {
    const parsed = asNumber(candidate);
    if (parsed == null) return;
    const clamped = clampNonNegative(parsed, 0);
    result[event as AssetEvent] = clamped;
  });
  return result;
};

const sanitizeCooldownSettings = (
  value: unknown,
  defaults: AssetCooldownSettings | undefined,
): AssetCooldownSettings => {
  const baseDefaults = defaults ?? createDefaultCooldownSettings();
  const record =
    typeof value === 'object' && value !== null
      ? (value as Partial<AssetCooldownSettings> & Record<string, unknown>)
      : {};

  const defaultAudioMs = clampNonNegative(
    asNumber(record.defaultAudioMs),
    baseDefaults.defaultAudioMs ?? DEFAULT_AUDIO_COOLDOWN_MS,
  );
  const defaultLottieMs = clampNonNegative(
    asNumber(record.defaultLottieMs),
    baseDefaults.defaultLottieMs ?? DEFAULT_LOTTIE_COOLDOWN_MS,
  );

  const audioMs = sanitizeCooldownMap(record.audioMs);
  const lottieMs = sanitizeCooldownMap(record.lottieMs);

  const baseCoalesce = baseDefaults.coalesceWindowMs
    ? { ...baseDefaults.coalesceWindowMs }
    : { ...DEFAULT_COALESCE_WINDOW_MAP };
  const coalesceInput = sanitizeCooldownMap(record.coalesceWindowMs);
  const coalesceWindowMs = { ...baseCoalesce, ...coalesceInput };

  return {
    audioMs,
    lottieMs,
    coalesceWindowMs,
    defaultAudioMs,
    defaultLottieMs,
  } satisfies AssetCooldownSettings;
};

export const sanitizeAssetSettings = (value: unknown): AssetSettings => {
  const defaults = createDefaultAssetSettings();
  if (typeof value !== 'object' || value === null) {
    return defaults;
  }
  const record = value as Partial<AssetSettings> & Record<string, unknown>;
  const libraryEntries = Object.entries((record.library ?? {}) as Record<string, unknown>).map(([id, candidate]) => {
    const normalized = sanitizeAssetRef(candidate);
    if (!normalized) return null;
    return [id, normalized] as const;
  });
  const library = Object.fromEntries(libraryEntries.filter(Boolean) as [string, AssetRef][]);

  const bindingsInput = (record.bindings ?? {}) as Partial<AssetSettings['bindings']>;
  const bindings = {
    audio: sanitizeAssetBindingMap(bindingsInput.audio),
    lottie: sanitizeAssetBindingMap(bindingsInput.lottie),
    image: sanitizeAssetBindingMap(bindingsInput.image),
  } satisfies AssetSettings['bindings'];

  const audioInput = (record.audio ?? {}) as Partial<AssetSettings['audio']>;
  const audio = {
    masterVolume: clamp01(asNumber(audioInput.masterVolume), defaults.audio.masterVolume),
    enabled: typeof audioInput.enabled === 'boolean' ? audioInput.enabled : defaults.audio.enabled,
  } satisfies AssetSettings['audio'];

  const animationsInput = (record.animations ?? {}) as Partial<AssetSettings['animations']>;
  const animations = {
    enabled:
      typeof animationsInput.enabled === 'boolean' ? animationsInput.enabled : defaults.animations.enabled,
    preferReducedMotion:
      typeof animationsInput.preferReducedMotion === 'boolean'
        ? animationsInput.preferReducedMotion
        : defaults.animations.preferReducedMotion,
  } satisfies AssetSettings['animations'];

  const cooldown = sanitizeCooldownSettings(record.cooldown, defaults.cooldown);

  return {
    library,
    bindings,
    audio,
    animations,
    cooldown,
  } satisfies AssetSettings;
};
