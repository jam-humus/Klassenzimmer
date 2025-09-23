import type { AssetEvent } from '~/types/settings';

export type SnapshotAssetEvent = Extract<AssetEvent, 'xp_awarded' | 'level_up' | 'badge_award'>;

export type SnapshotEventDetail = {
  event: SnapshotAssetEvent;
  label: string;
  description: string;
};

export const SNAPSHOT_AUDIO_EVENT_DETAILS: readonly SnapshotEventDetail[] = [
  {
    event: 'xp_awarded',
    label: 'XP-Phase',
    description: 'Sound, wenn die gewonnenen XP im Snapshot eingeblendet werden.',
  },
  {
    event: 'level_up',
    label: 'Level-Phase',
    description: 'Sound für Level-Aufstiege innerhalb der Snapshot-Präsentation.',
  },
  {
    event: 'badge_award',
    label: 'Badge-Phase',
    description: 'Sound, wenn neue Badges im Snapshot vorgestellt werden.',
  },
] as const;

export const SNAPSHOT_AUDIO_EVENTS: readonly SnapshotAssetEvent[] = SNAPSHOT_AUDIO_EVENT_DETAILS.map(
  (entry) => entry.event,
);

export const isSnapshotAssetEvent = (value: AssetEvent): value is SnapshotAssetEvent =>
  SNAPSHOT_AUDIO_EVENTS.includes(value as SnapshotAssetEvent);
