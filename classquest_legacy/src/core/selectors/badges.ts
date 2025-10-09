import type { AppState, Student, BadgeDefinition } from '~/types/models';

const FALLBACK_CATEGORY = 'uncategorized';

const resolveCategoryNameById = (state: AppState, categoryId: string | null | undefined) => {
  if (!categoryId) return null;
  return state.categories?.find((c) => c.id === categoryId)?.name ?? null;
};

const resolveQuestCategoryName = (state: AppState, questId: string | undefined) => {
  if (!questId) return null;
  const quest = state.quests.find((q) => q.id === questId);
  if (!quest) return null;
  const byId = resolveCategoryNameById(state, quest.categoryId ?? null);
  return byId ?? quest.category ?? null;
};

export function selectStudentCategoryXp(state: AppState, student: Student): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const entry of state.logs ?? []) {
    if (entry.studentId !== student.id) continue;
    const category =
      resolveCategoryNameById(state, entry.questCategoryId ?? null) ??
      entry.questCategory ??
      resolveQuestCategoryName(state, entry.questId) ??
      FALLBACK_CATEGORY;
    const delta = Number(entry.xp ?? 0);
    totals[category] = (totals[category] ?? 0) + delta;
  }
  return totals;
}

export const studentHasBadge = (student: Student, badgeId: string) =>
  student.badges.some((badge) => badge.id === badgeId);

export function shouldAutoAward(state: AppState, student: Student, definition: BadgeDefinition): boolean {
  const rule = definition.rule;
  if (!rule) return false;
  if (rule.type === 'total_xp') {
    return (student.xp ?? 0) >= rule.threshold;
  }
  if (rule.type === 'category_xp') {
    const targetName =
      resolveCategoryNameById(state, rule.categoryId ?? null) ??
      (rule.category ?? null);
    if (!targetName) return false;
    const totals = selectStudentCategoryXp(state, student);
    const sum = totals[targetName] ?? 0;
    return sum >= rule.threshold;
  }
  return false;
}
