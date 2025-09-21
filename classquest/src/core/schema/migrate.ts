import type { AppStateType, CategoryType } from './appState';

const randomId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

const normalizeCategory = (cat: CategoryType): CategoryType => ({
  id: cat.id,
  name: (cat.name ?? 'Kategorie').trim() || 'Kategorie',
  color: cat.color ?? null,
});

/** Migrate an arbitrary parsed state to the current version.
 * Extend this with case statements as you bump versions.
 */
export function migrateState(state: AppStateType): AppStateType {
  const categoriesById = new Map<string, CategoryType>();
  const categoriesByName = new Map<string, CategoryType>();
  const categories: CategoryType[] = [];

  const registerCategory = (cat: CategoryType) => {
    const existing = categoriesById.get(cat.id);
    if (existing) {
      // ensure latest trimmed name
      if (existing.name !== cat.name || existing.color !== cat.color) {
        const normalized = normalizeCategory(cat);
        categoriesById.set(normalized.id, normalized);
        categoriesByName.set(normalized.name.toLowerCase(), normalized);
        const index = categories.findIndex((entry) => entry.id === normalized.id);
        if (index >= 0) categories[index] = normalized;
      }
      return existing;
    }
    const normalized = normalizeCategory(cat);
    categoriesById.set(normalized.id, normalized);
    if (!categoriesByName.has(normalized.name.toLowerCase())) {
      categoriesByName.set(normalized.name.toLowerCase(), normalized);
    }
    categories.push(normalized);
    return normalized;
  };

  (state.categories ?? []).forEach((cat) => {
    registerCategory(cat);
  });

  const ensureCategoryIdPresent = (id: string | null | undefined, fallbackName?: string | null): string | null => {
    if (!id) return null;
    const existing = categoriesById.get(id);
    if (existing) return existing.id;
    const name = (fallbackName ?? 'Kategorie').trim() || 'Kategorie';
    registerCategory({ id, name, color: null });
    return id;
  };

  const ensureCategoryByName = (name?: string | null): string | null => {
    const trimmed = (name ?? '').trim();
    if (!trimmed) return null;
    const existing = categoriesByName.get(trimmed.toLowerCase());
    if (existing) return existing.id;
    const id = randomId();
    registerCategory({ id, name: trimmed, color: null });
    return id;
  };

  const quests = state.quests.map((quest) => {
    const legacyName = quest.category ?? null;
    let categoryId = ensureCategoryIdPresent(quest.categoryId ?? null, legacyName);
    if (!categoryId && legacyName) {
      categoryId = ensureCategoryByName(legacyName);
    }
    return {
      ...quest,
      category: legacyName,
      categoryId: categoryId ?? null,
    };
  });

  const badgeDefs = state.badgeDefs.map((definition) => {
    const legacyName = definition.category ?? null;
    let categoryId = ensureCategoryIdPresent(definition.categoryId ?? null, legacyName);
    if (!categoryId && legacyName) {
      categoryId = ensureCategoryByName(legacyName);
    }
    const rule = (() => {
      const current = definition.rule;
      if (!current || current.type !== 'category_xp') return current;
      const ruleLegacy = current.category ?? null;
      const fallback = ruleLegacy ?? legacyName ?? 'uncategorized';
      let ruleCategoryId = ensureCategoryIdPresent(current.categoryId ?? null, fallback);
      if (!ruleCategoryId && fallback) {
        ruleCategoryId = ensureCategoryByName(fallback);
      }
      return {
        type: 'category_xp' as const,
        threshold: current.threshold,
        categoryId: ruleCategoryId ?? null,
        category: fallback,
      };
    })();
    return {
      ...definition,
      category: legacyName,
      categoryId: categoryId ?? null,
      rule,
    };
  });

  return {
    ...state,
    quests,
    badgeDefs,
    categories,
  };
}
