import { describe, expect, it } from 'vitest';
import { calculateClassProgress } from '~/core/classProgress';

const compute = (totalXP: number, step: number) => {
  const progress = calculateClassProgress(totalXP, step);
  const pct = progress.step > 0 ? progress.stepXP / progress.step : 0;
  return {
    stars: progress.stars,
    stepXP: progress.stepXP,
    remainingXP: progress.remainingXP,
    pct,
  };
};

describe('Class progress math', () => {
  it('starts from 0 each milestone', () => {
    const step = 1000;
    expect(compute(0, step)).toMatchObject({ stars: 0, stepXP: 0, remainingXP: 1000, pct: 0 });
    expect(compute(999, step)).toMatchObject({ stars: 0, stepXP: 999, remainingXP: 1 });
    expect(compute(1000, step)).toMatchObject({ stars: 1, stepXP: 0, remainingXP: 1000, pct: 0 });
    expect(compute(1999, step)).toMatchObject({ stars: 1, stepXP: 999, remainingXP: 1 });
    expect(compute(2000, step)).toMatchObject({ stars: 2, stepXP: 0, remainingXP: 1000 });
  });

  it('handles custom step sizes', () => {
    const step = 750;
    expect(compute(1125, step)).toMatchObject({ stars: 1, stepXP: 375, remainingXP: 375 });
  });
});
