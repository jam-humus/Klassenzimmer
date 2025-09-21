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

export interface AssetSettings {
  library: Record<string, AssetRef>;
  bindings: {
    audio: AssetBindingMap;
    lottie: AssetBindingMap;
    image: AssetBindingMap;
  };
  audio: { masterVolume: number; enabled: boolean };
  animations: { enabled: boolean; preferReducedMotion: boolean };
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

  return {
    library,
    bindings,
    audio,
    animations,
  } satisfies AssetSettings;
};
