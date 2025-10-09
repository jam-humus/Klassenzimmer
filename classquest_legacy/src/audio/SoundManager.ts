import { Howl, Howler, type HowlOptions } from 'howler';
import { SOUND_DEFINITIONS, SOUND_KEYS, SOUND_COOLDOWNS_MS } from './sounds';
import {
  audioFormatFromMime,
  normalizeAudioFormat,
  inferAudioFormatFromSource,
  extractMimeFromDataUrl,
} from './format';
import type { PlayOptions, SoundKey, SoundOverride, SoundOverrides } from './types';
import { getBlob, getObjectURL, clearObjectURL } from '~/services/blobStore';

const SAFE_MIN_VOLUME = 0;
const SAFE_MAX_VOLUME = 1;

const EXTERNAL_SOURCE_PATTERN = /^(https?:|data:|blob:)/i;
const BLOB_OR_DATA_PATTERN = /^(blob:|data:)/i;

type OverrideConfig = {
  sources: string[];
  blobId?: string;
  format?: string | string[];
  html5?: boolean;
};

class SoundManager {
  private howls = new Map<SoundKey, Howl>();
  private lastPlay = new Map<SoundKey, number>();
  private cooldowns = new Map<SoundKey, number>();
  private initialized = false;
  private unlocked = false;
  private muted = false;
  private masterVolume = 1;
  private overrideConfigs = new Map<SoundKey, OverrideConfig>();

  async configure(overrides: SoundOverrides | undefined): Promise<void> {
    const entries = overrides ?? {};
    for (const key of SOUND_KEYS) {
      const override = entries[key] as SoundOverride | string | undefined;
      await this.applyOverrideForKey(key, override);
    }
  }

  init(): void {
    SOUND_KEYS.forEach((key) => {
      const definition = SOUND_DEFINITIONS[key];
      const cooldown = definition.cooldown ?? SOUND_COOLDOWNS_MS[key] ?? 0;
      this.cooldowns.set(key, cooldown);
      this.reloadHowl(key);
    });

    this.initialized = true;
    this.applyVolume();
    this.applyMute();
  }

  unlock(): void {
    if (this.unlocked) {
      return;
    }

    const ctx = Howler.ctx as (AudioContext | undefined);

    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch((error) => {
        console.warn('[SoundManager] Failed to resume audio context', error);
      });
    }

    if (ctx) {
      try {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        source.stop(0);
        source.disconnect();
      } catch (error) {
        console.warn('[SoundManager] Unlock shim failed', error);
      }
    }

    this.unlocked = true;
  }

  play(key: SoundKey, opts?: PlayOptions): void {
    if (!this.initialized) {
      this.init();
    }

    if (this.muted) {
      return;
    }

    const howl = this.howls.get(key);
    if (!howl) {
      return;
    }

    const now = this.getTimestamp();
    const cooldown = this.cooldowns.get(key) ?? 0;
    const last = this.lastPlay.get(key);
    if (cooldown > 0 && last !== undefined && now - last < cooldown) {
      return;
    }

    try {
      const playId = howl.play();
      if (typeof playId === 'number') {
        if (opts?.volume !== undefined) {
          howl.volume(this.clampVolume(opts.volume), playId);
        }
        if (opts?.rate !== undefined) {
          howl.rate(opts.rate, playId);
        }
      }
      this.lastPlay.set(key, now);
    } catch (error) {
      console.warn(`[SoundManager] Failed to play sound "${key}"`, error);
    }
  }

  stop(key?: SoundKey): void {
    if (key) {
      this.howls.get(key)?.stop();
      return;
    }

    this.howls.forEach((howl) => {
      howl.stop();
    });
  }

  setVolume(volume: number): void {
    this.masterVolume = this.clampVolume(volume);
    this.applyVolume();
  }

  getVolume(): number {
    return this.masterVolume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMute();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setCooldown(key: SoundKey, ms: number): void {
    this.cooldowns.set(key, Math.max(0, ms));
  }

  private applyVolume(): void {
    try {
      Howler.volume(this.masterVolume);
    } catch (error) {
      console.warn('[SoundManager] Failed to set master volume', error);
    }
  }

  private applyMute(): void {
    try {
      Howler.mute(this.muted);
    } catch (error) {
      console.warn('[SoundManager] Failed to set mute state', error);
    }
  }

  private getSourcesForKey(key: SoundKey): string[] {
    const override = this.overrideConfigs.get(key);
    if (override?.sources?.length) {
      return override.sources;
    }
    return SOUND_DEFINITIONS[key]?.sources ?? [];
  }

  private reloadHowl(key: SoundKey): void {
    const existing = this.howls.get(key);
    if (existing) {
      try {
        existing.unload();
      } catch (error) {
        console.warn(`[SoundManager] Failed to unload sound "${key}"`, error);
      }
      this.howls.delete(key);
    }

    const definition = SOUND_DEFINITIONS[key];
    if (!definition) {
      return;
    }

    const sources = this.getSourcesForKey(key);
    if (!sources.length) {
      return;
    }

    try {
      const baseOptions = definition.options ?? {};
      const override = this.overrideConfigs.get(key);
      const howlOptions: HowlOptions = {
        ...baseOptions,
        src: sources,
      };

      if (howlOptions.preload === undefined) {
        howlOptions.preload = true;
      }

      if (override?.html5 !== undefined) {
        howlOptions.html5 = override.html5;
      } else if (howlOptions.html5 === undefined) {
        howlOptions.html5 = false;
      }

      const normalizedFormat = normalizeAudioFormat(override?.format);
      if (normalizedFormat) {
        howlOptions.format = Array.isArray(normalizedFormat)
          ? normalizedFormat
          : [normalizedFormat];
      }

      const howl = new Howl(howlOptions);

      howl.on('loaderror', (_id: number, error: unknown) => {
        console.warn(`[SoundManager] Failed to load sound "${key}"`, error);
      });

      this.howls.set(key, howl);
    } catch (error) {
      console.warn(`[SoundManager] Error creating sound "${key}"`, error);
    }
  }

  private normalizeOverride(override: SoundOverride | string | undefined): SoundOverride | null {
    if (!override) {
      return null;
    }
    if (typeof override === 'string') {
      const trimmed = override.trim();
      if (!trimmed) {
        return null;
      }
      return { source: trimmed } satisfies SoundOverride;
    }
    const source = typeof override.source === 'string' ? override.source.trim() : '';
    if (!source) {
      return null;
    }
    const normalizedFormat = normalizeAudioFormat(override.format);
    if (normalizedFormat) {
      return { source, format: normalizedFormat } satisfies SoundOverride;
    }
    return { source } satisfies SoundOverride;
  }

  private async resolveOverride(
    override: SoundOverride | string | undefined,
  ): Promise<OverrideConfig | null> {
    const normalized = this.normalizeOverride(override);
    if (!normalized) {
      return null;
    }

    const source = normalized.source;
    let formatValue = normalized.format;
    const considerFormat = (candidate?: string | string[] | null) => {
      if (formatValue) {
        return;
      }
      const normalizedCandidate = normalizeAudioFormat(candidate);
      if (normalizedCandidate) {
        formatValue = normalizedCandidate;
      }
    };

    let resolvedSources: string[] | undefined;
    let blobId: string | undefined;
    let html5: boolean | undefined;

    if (EXTERNAL_SOURCE_PATTERN.test(source)) {
      resolvedSources = [source];
      if (BLOB_OR_DATA_PATTERN.test(source)) {
        html5 = true;
      }
      if (source.startsWith('data:')) {
        considerFormat(audioFormatFromMime(extractMimeFromDataUrl(source)));
      } else {
        considerFormat(inferAudioFormatFromSource(source));
      }
    } else {
      const url = await getObjectURL(source);
      if (url) {
        resolvedSources = [url];
        blobId = source;
        html5 = true;
        try {
          const blob = await getBlob(source);
          if (blob?.type) {
            considerFormat(audioFormatFromMime(blob.type));
          }
        } catch (error) {
          console.warn(`[SoundManager] Unable to read audio blob "${source}"`, error);
        }
      } else {
        console.warn(`[SoundManager] Unable to resolve audio blob "${source}"`);
      }
    }

    if (!resolvedSources || !resolvedSources.length) {
      return null;
    }

    considerFormat(inferAudioFormatFromSource(source));

    return {
      sources: resolvedSources,
      blobId,
      format: formatValue,
      html5,
    } satisfies OverrideConfig;
  }

  private async applyOverrideForKey(
    key: SoundKey,
    override: SoundOverride | string | undefined,
  ): Promise<void> {
    const resolved = await this.resolveOverride(override);
    const previous = this.overrideConfigs.get(key);
    if (previous?.blobId && previous.blobId !== resolved?.blobId) {
      clearObjectURL(previous.blobId);
    }

    if (resolved) {
      this.overrideConfigs.set(key, resolved);
    } else {
      this.overrideConfigs.delete(key);
    }

    if (this.initialized) {
      this.reloadHowl(key);
    }
  }

  private clampVolume(volume: number): number {
    if (Number.isNaN(volume)) {
      return this.masterVolume;
    }

    return Math.min(SAFE_MAX_VOLUME, Math.max(SAFE_MIN_VOLUME, volume));
  }

  private getTimestamp(): number {
    if (typeof performance !== 'undefined') {
      return performance.now();
    }

    return Date.now();
  }
}

export const soundManager = new SoundManager();
