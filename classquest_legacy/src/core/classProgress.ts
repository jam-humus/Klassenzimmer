import { DEFAULT_SETTINGS } from './config';
import type { ClassProgress, Settings, Student } from '~/types/models';

export const normalizeClassMilestoneStep = (step?: number | null): number => {
  const numericCandidate = Number(step);
  const numeric = Number.isFinite(numericCandidate)
    ? Math.floor(numericCandidate)
    : DEFAULT_SETTINGS.classMilestoneStep;
  return Math.max(1, numeric || DEFAULT_SETTINGS.classMilestoneStep);
};

export const calculateClassProgress = (
  totalXPInput: number,
  stepInput?: number | null,
): ClassProgress => {
  const step = normalizeClassMilestoneStep(stepInput);
  const totalCandidate = Number(totalXPInput);
  const totalXP = Number.isFinite(totalCandidate) ? Math.max(0, totalCandidate) : 0;
  const stars = Math.floor(totalXP / step);
  const stepXP = totalXP % step;
  const remainingXP = Math.max(0, step - stepXP);
  return { totalXP, stars, step, stepXP, remainingXP };
};

export const computeClassProgress = (students: Student[], settings: Settings): ClassProgress => {
  const totalXP = Math.max(
    0,
    students.reduce((sum, student) => sum + (Number.isFinite(student.xp) ? student.xp : 0), 0),
  );
  return calculateClassProgress(totalXP, settings.classMilestoneStep);
};
