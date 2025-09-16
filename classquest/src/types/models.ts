export type ID = string;

export interface Student {
  id: ID;
  alias: string;
  xp: number;
  level: number;
  teamId?: ID;
  streaks: { [questId: ID]: number };
  lastAwardedDay: { [questId: ID]: string };
  awardedBadgeIds: ID[];
}

export interface Team {
  id: ID;
  name: string;
}

export interface Quest {
  id: ID;
  name: string;
  xp: number;
  type: 'daily' | 'repeatable' | 'oneoff';
  active: boolean;
}

export interface Badge {
  id: ID;
  name: string;
  description: string;
  imageFile: string;
}

export interface LogEntry {
  id: ID;
  timestamp: number;
  studentId: ID;
  questId: ID;
  questName: string;
  xpAwarded: number;
}

export interface Settings {
  className: string;
  xpPerLevel: number;
  streakThresholdForBadge: number;
}

export interface AppState {
  students: Student[];
  teams: Team[];
  quests: Quest[];
  badges: Badge[];
  log: LogEntry[];
  settings: Settings;
}
