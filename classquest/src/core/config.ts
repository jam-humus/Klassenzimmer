export const DEFAULT_SETTINGS = {
  className: 'Meine Klasse',
  xpPerLevel: 100,
  streakThresholdForBadge: 5,
  allowNegativeXP: false,
  sfxEnabled: false,
  animationsEnabled: true,
  kidModeEnabled: false,
  compactMode: false,
  shortcutsEnabled: true,
  onboardingCompleted: false,
  flags: { virtualize: false } as Record<string, boolean>,
} as const;
