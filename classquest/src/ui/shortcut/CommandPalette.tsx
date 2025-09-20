import React from 'react';
import { useApp } from '~/app/AppContext';
import { filterPaletteEntries } from './matcher';
import { useHotkeyLock } from './KeyScope';
import {
  EVENT_EXPORT_DATA,
  EVENT_IMPORT_DATA,
  EVENT_FOCUS_STUDENT,
  EVENT_SELECT_ALL,
  EVENT_SET_ACTIVE_QUEST,
  EVENT_TOGGLE_GROUP_FILTER,
  EVENT_UNDO_PERFORMED,
} from './events';

type Tab = 'award' | 'leaderboard' | 'overview' | 'log' | 'manage' | 'info';

type PaletteItem = {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  setTab: (tab: Tab) => void;
  onOpenSeasonReset: () => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export function createPaletteItems(
  params: {
    setTab: (tab: Tab) => void;
    onOpenSeasonReset: () => void;
    dispatch: ReturnType<typeof useApp>['dispatch'];
    state: ReturnType<typeof useApp>['state'];
  },
): PaletteItem[] {
  const { state, dispatch, setTab, onOpenSeasonReset } = params;
  const afterTab = (tab: Tab, fn: () => void) => {
    setTab(tab);
    window.setTimeout(fn, 20);
  };

  const navItems: PaletteItem[] = [
    { id: 'nav-award', label: 'Gehe zu: Vergeben', group: 'Navigation', keywords: 'award', run: () => setTab('award') },
    {
      id: 'nav-leaderboard',
      label: 'Gehe zu: Leaderboard',
      group: 'Navigation',
      keywords: 'ranking',
      run: () => setTab('leaderboard'),
    },
    {
      id: 'nav-overview',
      label: 'Gehe zu: Überblick',
      group: 'Navigation',
      keywords: 'overview klasse klassenübersicht',
      run: () => setTab('overview'),
    },
    { id: 'nav-log', label: 'Gehe zu: Protokoll', group: 'Navigation', keywords: 'log', run: () => setTab('log') },
    { id: 'nav-manage', label: 'Gehe zu: Verwalten', group: 'Navigation', keywords: 'manage', run: () => setTab('manage') },
    { id: 'nav-info', label: 'Gehe zu: Info', group: 'Navigation', keywords: 'hilfe info', run: () => setTab('info') },
  ];

  const actions: PaletteItem[] = [
    {
      id: 'action-undo',
      label: 'Letzte Aktion rückgängig',
      group: 'Aktionen',
      keywords: 'undo rückgängig u',
      run: () => {
        dispatch({ type: 'UNDO_LAST' });
        window.dispatchEvent(new Event(EVENT_UNDO_PERFORMED));
      },
    },
    {
      id: 'action-export',
      label: 'Daten exportieren',
      group: 'Aktionen',
      run: () => {
        afterTab('manage', () => window.dispatchEvent(new Event(EVENT_EXPORT_DATA)));
      },
    },
    {
      id: 'action-import',
      label: 'Daten importieren',
      group: 'Aktionen',
      run: () => {
        afterTab('manage', () => window.dispatchEvent(new Event(EVENT_IMPORT_DATA)));
      },
    },
    {
      id: 'action-reset',
      label: 'Saison zurücksetzen…',
      group: 'Aktionen',
      keywords: 'season reset',
      run: () => {
        setTab('manage');
        onOpenSeasonReset();
      },
    },
    {
      id: 'action-select-all',
      label: 'Alle auswählen (Vergeben)',
      group: 'Aktionen',
      run: () => {
        afterTab('award', () => window.dispatchEvent(new Event(EVENT_SELECT_ALL)));
      },
    },
  ];

  const studentItems: PaletteItem[] = state.students.map((student) => ({
    id: `student-${student.id}`,
    label: `Schüler: ${student.alias}`,
    group: 'Schüler',
    keywords: student.alias,
    run: () => {
      afterTab('award', () => {
        window.dispatchEvent(new CustomEvent(EVENT_FOCUS_STUDENT, { detail: student.id }));
      });
    },
  }));

  const questItems: PaletteItem[] = state.quests
    .filter((quest) => quest.active)
    .map((quest) => ({
      id: `quest-${quest.id}`,
      label: `Quest aktivieren: ${quest.name} (+${quest.xp} XP)`,
      group: 'Quests',
      keywords: quest.name,
      run: () => {
        afterTab('award', () => {
          window.dispatchEvent(new CustomEvent(EVENT_SET_ACTIVE_QUEST, { detail: quest.id }));
        });
      },
    }));

  const groupItems: PaletteItem[] = state.teams.map((team) => ({
    id: `group-${team.id}`,
    label: `Gruppe filtern: ${team.name}`,
    group: 'Gruppen',
    keywords: team.name,
    run: () => {
      afterTab('award', () => {
        window.dispatchEvent(new CustomEvent(EVENT_TOGGLE_GROUP_FILTER, { detail: team.id }));
      });
    },
  }));

  return [...navItems, ...actions, ...studentItems, ...questItems, ...groupItems];
}

export default function CommandPalette({ open, onClose, setTab, onOpenSeasonReset }: CommandPaletteProps) {
  const { state, dispatch } = useApp();
  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const items = React.useMemo(
    () => createPaletteItems({ state, dispatch, setTab, onOpenSeasonReset }),
    [state, dispatch, setTab, onOpenSeasonReset],
  );
  const filtered = React.useMemo(() => filterPaletteEntries(items, query), [items, query]);

  useHotkeyLock(open);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(filtered.length > 0 ? filtered.length - 1 : 0);
    }
  }, [filtered, activeIndex]);

  const runItem = React.useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      item.run();
      onClose();
    },
    [onClose],
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, filtered.length - 1)));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        runItem(filtered[activeIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    },
    [filtered, activeIndex, onClose, runItem],
  );

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-hotkey-suspend="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.4)',
        display: 'grid',
        placeItems: 'start center',
        paddingTop: '10vh',
        zIndex: 1100,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(720px, 92vw)',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(15, 23, 42, 0.35)',
          padding: 16,
          display: 'grid',
          gap: 12,
        }}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Befehl oder Name suchen…"
          aria-label="Befehl suchen"
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid #cbd5f5',
            fontSize: 16,
          }}
        />
        <div
          role="listbox"
          aria-label="Suchergebnisse"
          style={{ maxHeight: '50vh', overflowY: 'auto', display: 'grid', gap: 4 }}
        >
          {filtered.length === 0 && <div style={{ padding: '12px 14px', opacity: 0.6 }}>Keine Treffer</div>}
          {filtered.map((item, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => runItem(item)}
                onMouseEnter={() => setActiveIndex(index)}
                style={{
                  textAlign: 'left',
                  border: 'none',
                  background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                  borderRadius: 12,
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: 15,
                }}
              >
                <span>{item.label}</span>
                <span style={{ fontSize: 12, textTransform: 'uppercase', opacity: 0.6 }}>{item.group}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
