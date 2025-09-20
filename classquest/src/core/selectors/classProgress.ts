import type { AppState } from '~/types/models';

const ensureStep = (settings: AppState['settings']) =>
  Math.max(1, settings.classMilestoneStep ?? 1000);

export function selectClassProgress(state: AppState) {
  const step = ensureStep(state.settings);
  const total = Math.max(0, state.classProgress?.totalXP ?? 0);
  const stars = Math.floor(total / step);
  const nextTarget = Math.max(step, (stars + 1) * step);
  const remaining = Math.max(0, nextTarget - total);
  const ratio = nextTarget > 0 ? Math.min(1, total / nextTarget) : 0;
  return { step, total, stars, nextTarget, remaining, ratio };
}
