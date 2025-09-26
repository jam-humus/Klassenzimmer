import type { Settings } from '~/types/models';
export const DEFAULT_SETTINGS: Required<Settings> = {
  className: 'Meine Klasse',
  xpPerLevel: 100,
  avatarStageThresholds: [3, 6],
  streakThresholdForBadge: 5,
  allowNegativeXP: false,
  sfxEnabled: false,
  animationsEnabled: true,
  kidModeEnabled: false,
  compactMode: false,
  shortcutsEnabled: true,
  onboardingCompleted: false,
  theme: 'space',
  flags: { virtualize: false } as Record<string, boolean>,
  classStarIconKey: null,
  classMilestoneStep: 1000,
  classStarsName: 'Stern',
};
