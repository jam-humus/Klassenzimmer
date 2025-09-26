export const SOUND_KEYS = [
  'xp-grant',
  'level-up',
  'badge-award',
  'slideshow-avatar',
  'slideshow-badge-flyin',
] as const;

export type SoundKey = (typeof SOUND_KEYS)[number];

export const SOUND_LABELS: Record<SoundKey, string> = {
  'xp-grant': 'XP vergeben',
  'level-up': 'Level-Up',
  'badge-award': 'Badge vergeben',
  'slideshow-avatar': 'Slideshow Avatar',
  'slideshow-badge-flyin': 'Slideshow Badge-Fly-in',
};

export type SoundOverride = {
  source: string;
  format?: string | string[];
};

export type SoundOverrides = Partial<Record<SoundKey, SoundOverride>>;

export type PlayOptions = {
  volume?: number;
  rate?: number;
};

export type SoundSettings = {
  enabled: boolean;
  volume: number;
};
