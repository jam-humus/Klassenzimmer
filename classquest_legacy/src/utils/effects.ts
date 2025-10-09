import type { Settings } from '~/types/models';

const DEFAULT_COALESCE_WINDOW_MS = 300;

let animationsEnabled = true;
let coalesceWindowMs = DEFAULT_COALESCE_WINDOW_MS;
let pendingTimeout: number | undefined;

export const setEffectsSettings = (settings: Settings | null | undefined): void => {
  animationsEnabled = settings?.animationsEnabled ?? true;
  coalesceWindowMs = DEFAULT_COALESCE_WINDOW_MS;
};

export function triggerEventLottie(): void {
  // Effects are disabled while the asset manager is turned off.
}

export function playXpAwardedEffectsCoalesced(): void {
  if (!animationsEnabled || typeof window === 'undefined') {
    return;
  }
  if (pendingTimeout != null) {
    window.clearTimeout(pendingTimeout);
  }
  pendingTimeout = window.setTimeout(() => {
    pendingTimeout = undefined;
  }, coalesceWindowMs);
}

export async function preloadEffects(): Promise<void> {
  // With the asset manager removed there is nothing to preload.
}
