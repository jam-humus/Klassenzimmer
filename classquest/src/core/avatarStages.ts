import { DEFAULT_SETTINGS } from './config';

export const AVATAR_STAGE_COUNT = 3;

export type AvatarStageThresholds = [number, number];

const MIN_THRESHOLD = 1;

function sanitizeThresholdValue(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(MIN_THRESHOLD, Math.floor(value));
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.max(MIN_THRESHOLD, Math.floor(parsed));
    }
  }
  return Math.max(MIN_THRESHOLD, Math.floor(fallback));
}

export function sanitizeAvatarStageThresholds(
  raw: unknown,
  fallback: AvatarStageThresholds = DEFAULT_SETTINGS.avatarStageThresholds,
): AvatarStageThresholds {
  const safeFallback: AvatarStageThresholds = [
    Math.max(MIN_THRESHOLD, Math.floor(fallback?.[0] ?? DEFAULT_SETTINGS.avatarStageThresholds[0])),
    Math.max(
      Math.max(MIN_THRESHOLD, Math.floor(fallback?.[0] ?? DEFAULT_SETTINGS.avatarStageThresholds[0])) + 1,
      Math.floor(fallback?.[1] ?? DEFAULT_SETTINGS.avatarStageThresholds[1]),
    ),
  ];

  const values = Array.isArray(raw) ? raw : [];
  const thresholds: number[] = [];

  for (let index = 0; index < AVATAR_STAGE_COUNT - 1; index += 1) {
    const candidate = values[index];
    const previous = thresholds[index - 1];
    const fallbackValue = index === 0 ? safeFallback[0] : safeFallback[index] ?? (previous ?? safeFallback[0]) + 1;
    let next = sanitizeThresholdValue(candidate, fallbackValue);
    if (previous != null && next <= previous) {
      next = previous + 1;
    }
    thresholds.push(next);
  }

  while (thresholds.length < AVATAR_STAGE_COUNT - 1) {
    const previous = thresholds[thresholds.length - 1] ?? safeFallback[0];
    thresholds.push(previous + 1);
  }

  return thresholds.slice(0, AVATAR_STAGE_COUNT - 1) as AvatarStageThresholds;
}

export function resolveAvatarStageIndex(
  level: number,
  thresholds: readonly number[],
): number {
  const safeLevel = Math.max(MIN_THRESHOLD, Math.floor(Number.isFinite(level) ? level : MIN_THRESHOLD));
  let stage = 0;
  for (let index = 0; index < thresholds.length; index += 1) {
    if (safeLevel >= thresholds[index]) {
      stage = index + 1;
    } else {
      break;
    }
  }
  return Math.max(0, Math.min(stage, AVATAR_STAGE_COUNT - 1));
}
