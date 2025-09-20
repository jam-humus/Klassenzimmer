export type ID = string;

export type BadgeRule =
  | { type: 'category_xp'; category: string; threshold: number }
  | { type: 'total_xp'; threshold: number };

export type Badge = {
  id: ID;
  name: string;
  iconKey?: string | null;
  description?: string;
  awardedAt: string;
};

export type StudentAvatarMode = 'procedural' | 'imagePack';
export type StudentAvatarPack = {
  stageKeys: (string | null)[];
};

export type Student = {
  id: ID; alias: string; xp: number; level: number;
  streaks: Record<ID, number>;
  lastAwardedDay: Record<ID, string>; // YYYY-MM-DD
  badges: Badge[]; teamId?: ID;
  avatarMode?: StudentAvatarMode;
  avatarPack?: StudentAvatarPack;
};

export type Team = { id: ID; name: string; memberIds: ID[] };
export type QuestType = 'daily'|'repeatable'|'oneoff';
export type QuestTarget = 'individual'|'team';

export type Quest = {
  id: ID; name: string; description?: string; xp: number;
  type: QuestType; target: QuestTarget; isPersonalTo?: ID; active: boolean;
  category?: string | null;
};

export type LogEntry = {
  id: ID; timestamp: number; studentId: ID; questId: ID; questName: string; xp: number; note?: string;
  questCategory?: string | null;
};

export type ClassProgress = {
  totalXP: number;
  stars: number;
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
  classStarIconKey?: string | null;
  classMilestoneStep?: number;
  classStarsName?: string;
};

export type BadgeDefinition = {
  id: ID;
  name: string;
  description?: string;
  category?: string | null;
  iconKey?: string | null;
  rule?: BadgeRule | null;
};

export type AppState = {
  students: Student[]; teams: Team[]; quests: Quest[]; logs: LogEntry[];
  settings: Settings; version: number; classProgress: ClassProgress;
  badgeDefs: BadgeDefinition[];
};
