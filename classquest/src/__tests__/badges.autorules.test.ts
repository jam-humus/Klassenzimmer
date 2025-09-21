import { describe, it, expect } from 'vitest';
import { selectStudentCategoryXp, shouldAutoAward } from '~/core/selectors/badges';
import type { AppState, Student, BadgeDefinition } from '~/types/models';
import { createDefaultAssetSettings } from '~/types/settings';

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

const baseStudent: Student = {
  id: 's1',
  alias: 'Amy',
  xp: 150,
  level: 2,
  streaks: {},
  lastAwardedDay: {},
  badges: [],
  avatarMode: 'procedural',
  avatarPack: { stageKeys: [null, null, null] },
};

const baseState: Mutable<AppState> = {
  students: [],
  teams: [],
  quests: [
    {
      id: 'q1',
      name: 'Hausaufgaben',
      xp: 40,
      type: 'daily',
      target: 'individual',
      active: true,
      description: undefined,
      isPersonalTo: undefined,
      category: 'homework',
      categoryId: 'cat-homework',
    },
    {
      id: 'q2',
      name: 'Mitarbeit',
      xp: 60,
      type: 'daily',
      target: 'individual',
      active: true,
      description: undefined,
      isPersonalTo: undefined,
      category: 'participation',
      categoryId: 'cat-participation',
    },
  ],
  logs: [
    {
      id: 'l1',
      timestamp: 1,
      studentId: 's1',
      questId: 'q1',
      questName: 'Hausaufgaben',
      xp: 40,
      note: undefined,
      questCategory: 'homework',
      questCategoryId: 'cat-homework',
    },
    {
      id: 'l2',
      timestamp: 2,
      studentId: 's1',
      questId: 'q2',
      questName: 'Mitarbeit',
      xp: 30,
      note: undefined,
      questCategory: null,
      questCategoryId: 'cat-participation',
    },
    {
      id: 'l3',
      timestamp: 3,
      studentId: 's1',
      questId: 'q2',
      questName: 'Mitarbeit',
      xp: 30,
      note: undefined,
      questCategory: undefined,
      questCategoryId: 'cat-participation',
    },
  ],
  settings: {
    className: 'Klasse',
    xpPerLevel: 100,
    streakThresholdForBadge: 5,
    allowNegativeXP: false,
    classMilestoneStep: 1000,
    classStarIconKey: null,
    classStarsName: 'Stern',
    assets: createDefaultAssetSettings(),
  },
  version: 1,
  classProgress: { totalXP: 0, stars: 0 },
  badgeDefs: [],
  categories: [
    { id: 'cat-homework', name: 'homework', color: null },
    { id: 'cat-participation', name: 'participation', color: null },
  ],
};

describe('badge selectors', () => {
  it('aggregates student xp per category from logs', () => {
    const totals = selectStudentCategoryXp(baseState, baseStudent);
    expect(totals.homework).toBe(40);
    expect(totals.participation).toBe(60);
  });

  it('evaluates total_xp auto-award rule against current xp', () => {
    const def: BadgeDefinition = {
      id: 'b-total',
      name: 'Levelaufstieg',
      category: null,
      categoryId: null,
      iconKey: null,
      description: undefined,
      rule: { type: 'total_xp', threshold: 120 },
    };
    expect(shouldAutoAward(baseState, baseStudent, def)).toBe(true);
  });

  it('evaluates category_xp auto-award rule using aggregated logs', () => {
    const def: BadgeDefinition = {
      id: 'b-cat',
      name: 'Hausaufgaben-Profi',
      category: 'homework',
      categoryId: 'cat-homework',
      iconKey: null,
      description: undefined,
      rule: { type: 'category_xp', category: 'homework', categoryId: 'cat-homework', threshold: 40 },
    };
    expect(shouldAutoAward(baseState, baseStudent, def)).toBe(true);
  });
});
