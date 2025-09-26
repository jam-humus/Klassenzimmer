export type SoundKey =
  | 'xp-grant'
  | 'level-up'
  | 'badge-award'
  | 'slideshow-avatar'
  | 'slideshow-badge-flyin';

export type PlayOptions = {
  volume?: number;
  rate?: number;
};

export type SoundSettings = {
  enabled: boolean;
  volume: number;
};
