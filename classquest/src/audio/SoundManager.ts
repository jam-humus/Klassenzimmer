import { Howl, Howler } from 'howler';
import { SOUND_DEFINITIONS, SOUND_KEYS, SOUND_COOLDOWNS_MS } from './sounds';
import type { PlayOptions, SoundKey } from './types';

const SAFE_MIN_VOLUME = 0;
const SAFE_MAX_VOLUME = 1;

class SoundManager {
  private howls = new Map<SoundKey, Howl>();
  private lastPlay = new Map<SoundKey, number>();
  private cooldowns = new Map<SoundKey, number>();
  private initialized = false;
  private unlocked = false;
  private muted = false;
  private masterVolume = 1;

  init(): void {
    SOUND_KEYS.forEach((key) => {
      const definition = SOUND_DEFINITIONS[key];
      if (!definition) {
        return;
      }

      const cooldown = definition.cooldown ?? SOUND_COOLDOWNS_MS[key] ?? 0;
      this.cooldowns.set(key, cooldown);

      if (this.howls.has(key)) {
        return;
      }

      try {
        const howl = new Howl({
          src: definition.sources,
          html5: false,
          preload: true,
          ...(definition.options ?? {}),
        });

        howl.on('loaderror', (_id, error) => {
          console.warn(`[SoundManager] Failed to load sound "${key}"`, error);
        });

        this.howls.set(key, howl);
      } catch (error) {
        console.warn(`[SoundManager] Error creating sound "${key}"`, error);
      }
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
