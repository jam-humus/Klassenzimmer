import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './config';

describe('DEFAULT_SETTINGS', () => {
  it('provides the initial class configuration', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      className: 'Meine Klasse',
      xpPerLevel: 100,
      streakThresholdForBadge: 5
    });
  });
});
