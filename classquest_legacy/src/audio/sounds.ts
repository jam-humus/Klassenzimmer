import type { HowlOptions } from 'howler';
import { SOUND_KEYS, type SoundKey } from './types';

export type SoundDefinition = {
  sources: string[];
  options?: Omit<HowlOptions, 'src'>;
  cooldown?: number;
};

const base = '/sfx';

export const SOUND_DEFINITIONS: Record<SoundKey, SoundDefinition> = {
  'xp-grant': {
    sources: [`${base}/xp_grant.mp3`, `${base}/xp_grant.ogg`],
    cooldown: 400,
    options: {
      preload: true,
    },
  },
  'level-up': {
    sources: [`${base}/level_up.mp3`, `${base}/level_up.ogg`],
    options: {
      preload: true,
    },
  },
  'badge-award': {
    sources: [`${base}/badge_award.mp3`, `${base}/badge_award.ogg`],
    options: {
      preload: true,
    },
  },
  'slideshow-avatar': {
    sources: [`${base}/slide_avatar.mp3`, `${base}/slide_avatar.ogg`],
    options: {
      preload: true,
    },
  },
  'slideshow-badge-flyin': {
    sources: [`${base}/slide_badge_flyin.mp3`, `${base}/slide_badge_flyin.ogg`],
    options: {
      preload: true,
    },
  },
};

export const SOUND_COOLDOWNS_MS: Partial<Record<SoundKey, number>> = Object.fromEntries(
  SOUND_KEYS.map((key) => [key, SOUND_DEFINITIONS[key].cooldown ?? 0]),
) as Partial<Record<SoundKey, number>>;

export { SOUND_KEYS };
