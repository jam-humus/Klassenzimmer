import { soundManager } from './SoundManager';
import type { SoundKey } from './types';

export type AppSoundEvent = 'xp_awarded' | 'level_up' | 'badge_award';
export type SnapshotSoundEvent = 'snap_xp' | 'snap_level' | 'snap_badge';

const APP_PRIORITY: Record<AppSoundEvent, number> = {
  xp_awarded: 1,
  level_up: 2,
  badge_award: 3,
};

const SNAP_PRIORITY: Record<SnapshotSoundEvent, number> = {
  snap_xp: 1,
  snap_level: 2,
  snap_badge: 3,
};

const APP_SOUND_MAP: Record<AppSoundEvent, SoundKey> = {
  xp_awarded: 'xp-grant',
  level_up: 'level-up',
  badge_award: 'badge-award',
};

const SNAP_SOUND_MAP: Record<SnapshotSoundEvent, SoundKey> = {
  snap_xp: 'xp-grant',
  snap_level: 'level-up',
  snap_badge: 'badge-award',
};

const WINDOW_MS = 150;

let appPending: { evt: AppSoundEvent; prio: number } | null = null;
let appTimer: ReturnType<typeof setTimeout> | null = null;
let snapPending: { evt: SnapshotSoundEvent; prio: number } | null = null;
let snapTimer: ReturnType<typeof setTimeout> | null = null;

const getTimestamp = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const clearTimer = (timer: ReturnType<typeof setTimeout> | null): void => {
  if (timer != null) {
    clearTimeout(timer);
  }
};

const flushAppQueue = (): void => {
  if (!appPending) {
    return;
  }
  const { evt } = appPending;
  appPending = null;
  clearTimer(appTimer);
  appTimer = null;
  soundManager.play(APP_SOUND_MAP[evt]);
};

const flushSnapshotQueue = (): void => {
  if (!snapPending) {
    return;
  }
  const { evt } = snapPending;
  snapPending = null;
  clearTimer(snapTimer);
  snapTimer = null;
  soundManager.play(SNAP_SOUND_MAP[evt]);
};

const scheduleFlush = (type: 'app' | 'snap'): void => {
  if (type === 'app') {
    if (appTimer != null) {
      return;
    }
    appTimer = setTimeout(flushAppQueue, WINDOW_MS);
  } else {
    if (snapTimer != null) {
      return;
    }
    snapTimer = setTimeout(flushSnapshotQueue, WINDOW_MS);
  }
};

export function queueAppSound(evt: AppSoundEvent, _now = getTimestamp()): void {
  const prio = APP_PRIORITY[evt];
  if (!appPending) {
    appPending = { evt, prio };
    scheduleFlush('app');
    return;
  }
  if (prio > appPending.prio) {
    appPending = { evt, prio };
  }
  // ensure timer exists even when overriding without scheduling yet
  scheduleFlush('app');
}

export function queueSnapshotSound(evt: SnapshotSoundEvent, _now = getTimestamp()): void {
  const prio = SNAP_PRIORITY[evt];
  if (!snapPending) {
    snapPending = { evt, prio };
    scheduleFlush('snap');
    return;
  }
  if (prio > snapPending.prio) {
    snapPending = { evt, prio };
  }
  scheduleFlush('snap');
}

export function resetSoundQueues(): void {
  appPending = null;
  snapPending = null;
  clearTimer(appTimer);
  clearTimer(snapTimer);
  appTimer = null;
  snapTimer = null;
}
