import { describe, expect, it } from 'vitest';
import { levelFromXP, todayKey } from './xp';

describe('levelFromXP', () => {
  it.each([
    { xp: 0, expected: 1 },
    { xp: 99, expected: 1 },
    { xp: 100, expected: 2 },
    { xp: 199, expected: 2 },
    { xp: 200, expected: 3 }
  ])('computes level $expected for $xp XP when xpPerLevel=100', ({ xp, expected }) => {
    expect(levelFromXP(xp, 100)).toBe(expected);
  });

  it('returns level 1 when xpPerLevel is zero or negative', () => {
    expect(levelFromXP(500, 0)).toBe(1);
    expect(levelFromXP(500, -10)).toBe(1);
  });

  it('treats negative XP as zero for level calculation', () => {
    expect(levelFromXP(-50, 100)).toBe(1);
  });
});

describe('todayKey', () => {
  it('formats the provided date as YYYY-MM-DD in local time', () => {
    const date = new Date(2025, 11, 24, 10, 30, 0);
    expect(todayKey(date)).toBe('2025-12-24');
  });

  it('pads month and day with leading zeros', () => {
    const date = new Date(2025, 0, 5, 8, 15, 0);
    expect(todayKey(date)).toBe('2025-01-05');
  });
});
