import { describe, expect, it, vi } from 'vitest';
import { levelFromXP, todayKey } from '~/core/xp';

describe('xp helpers', () => {
  it('calculates level based on xp per level', () => {
    expect(levelFromXP(0, 100)).toBe(1);
    expect(levelFromXP(99, 100)).toBe(1);
    expect(levelFromXP(100, 100)).toBe(2);
    expect(levelFromXP(250, 100)).toBe(3);
  });

  it('formats today key for provided date', () => {
    const key = todayKey(new Date(2024, 0, 5));
    expect(key).toBe('2024-01-05');
  });

  it('uses current date when none provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 6, 15, 10, 30, 0));

    expect(todayKey()).toBe('2024-07-15');

    vi.useRealTimers();
  });
});
