import { normalizeClassMilestoneStep } from '~/core/classProgress';
import type { AppState } from '~/types/models';

const ensureStep = (state: AppState) =>
  normalizeClassMilestoneStep(
    state.classProgress?.step ?? state.settings.classMilestoneStep ?? 1000,
  );

export function selectClassProgress(state: AppState) {
  const total = Math.max(0, state.classProgress?.totalXP ?? 0);
  const step = ensureStep(state);
  const stars = Math.max(0, Math.floor(state.classProgress?.stars ?? total / step));
  const stepXP = Math.max(0, Math.min(step, state.classProgress?.stepXP ?? (total % step)));
  const remaining = Math.max(0, state.classProgress?.remainingXP ?? step - stepXP);
  return { total, step, stars, stepXP, remaining };
}

export function selectClassProgressView(state: AppState) {
  const progress = selectClassProgress(state);
  const pct = Math.min(1, progress.stepXP / Math.max(1, progress.step));
  return {
    total: progress.total,
    stars: progress.stars,
    step: progress.step,
    current: progress.stepXP,
    remaining: progress.remaining,
    pct,
    label: `${progress.stepXP} / ${progress.step} XP – noch ${progress.remaining} XP bis zum nächsten Stern`,
  };
}
