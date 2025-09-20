export type ID = string;
export type Badge = { id: ID; name: string; icon?: string; description?: string };

export type Student = {
  id: ID; alias: string; xp: number; level: number;
  streaks: Record<ID, number>;
  lastAwardedDay: Record<ID, string>; // YYYY-MM-DD
  badges: Badge[]; teamId?: ID;
};

export type Team = { id: ID; name: string; memberIds: ID[] };
export type QuestType = 'daily'|'repeatable'|'oneoff';
export type QuestTarget = 'individual'|'team';

export type Quest = {
  id: ID; name: string; description?: string; xp: number;
  type: QuestType; target: QuestTarget; isPersonalTo?: ID; active: boolean;
};

export type LogEntry = {
  id: ID; timestamp: number; studentId: ID; questId: ID; questName: string; xp: number; note?: string;
};

export type Settings = {
  className: string;
  xpPerLevel: number;
  streakThresholdForBadge: number;
  allowNegativeXP?: boolean;
  sfxEnabled?: boolean;
  compactMode?: boolean;
  shortcutsEnabled?: boolean;
  onboardingCompleted?: boolean;
  animationsEnabled?: boolean;
  kidModeEnabled?: boolean;
  flags?: Record<string, boolean>;
};

export type AppState = {
  students: Student[]; teams: Team[]; quests: Quest[]; logs: LogEntry[];
  settings: Settings; version: number;
};
