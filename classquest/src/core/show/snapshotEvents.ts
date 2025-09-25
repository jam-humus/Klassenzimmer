import type { AppSoundEvent } from '~/types/settings';

export type SoundEventDetail = {
  event: AppSoundEvent;
  label: string;
  description: string;
};

export const SOUND_EVENT_DETAILS: readonly SoundEventDetail[] = [
  {
    event: 'xp_awarded',
    label: 'XP vergeben',
    description: 'Spielt ab, wenn XP vergeben werden oder XP-Gewinne im Snapshot erscheinen.',
  },
  {
    event: 'level_up',
    label: 'Level-Up',
    description: 'Sound für Levelaufstiege in der App und im Snapshot.',
  },
  {
    event: 'badge_award',
    label: 'Badge vergeben',
    description: 'Sound, wenn neue Badges verliehen oder im Snapshot gezeigt werden.',
  },
  {
    event: 'showcase_start',
    label: 'Snapshot/Showcase Start',
    description: 'Intro-Sound beim Start der Snapshot-Show.',
  },
] as const;
