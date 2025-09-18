import type { AppStateType } from './appState';

/** Migrate an arbitrary parsed state to the current version.
 * Extend this with case statements as you bump versions.
 */
export function migrateState(state: AppStateType): AppStateType {
  const s = { ...state };

  switch (true) {
    // Example: if (s.version === 1) { s = migrateFrom1To2(s); }
    default:
      break;
  }
  return s;
}
