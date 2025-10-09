import { describe, it, expect } from 'vitest';
import { sanitizeState } from '~/core/schema/appState';
import { migrateState } from '~/core/schema/migrate';

describe('schema sanitize & migrate', () => {
  it('repairs minimal state and validates', () => {
    const raw = {
      students: [],
      teams: [],
      quests: [],
      logs: [],
      settings: { className: 'K', xpPerLevel: 100, streakThresholdForBadge: 5 },
      version: 1,
    };
    const clean = sanitizeState(raw);
    expect(clean).toBeTruthy();
    const migrated = migrateState(clean!);
    expect(migrated.version).toBe(1);
  });

  it('rejects garbage', () => {
    const clean = sanitizeState('not-json' as unknown);
    expect(clean).toBeNull();
  });
});
