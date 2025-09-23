import type { SnapshotSoundEvent } from '~/types/settings';

export type SnapshotEventDetail = {
  event: SnapshotSoundEvent;
  label: string;
  description: string;
};

export const SNAPSHOT_SOUND_EVENT_DETAILS: readonly SnapshotEventDetail[] = [
  {
    event: 'snap_xp',
    label: 'Snapshot: XP-Animation',
    description: 'Sound, wenn die gewonnenen XP im Snapshot eingeblendet werden.',
  },
  {
    event: 'snap_level',
    label: 'Snapshot: Level-Change',
    description: 'Sound für Level-Aufstiege innerhalb der Snapshot-Präsentation.',
  },
  {
    event: 'snap_avatar',
    label: 'Snapshot: Avatar-Entwicklung',
    description: 'Sound, wenn der Avatar eine Stufe hochspringt.',
  },
  {
    event: 'snap_badge',
    label: 'Snapshot: Badge-Einblendung',
    description: 'Sound, wenn neue Badges im Snapshot vorgestellt werden.',
  },
] as const;

export const SNAPSHOT_SOUND_EVENTS: readonly SnapshotSoundEvent[] =
  SNAPSHOT_SOUND_EVENT_DETAILS.map((entry) => entry.event);

export const isSnapshotSoundEvent = (value: string): value is SnapshotSoundEvent =>
  SNAPSHOT_SOUND_EVENTS.includes(value as SnapshotSoundEvent);
