import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { useApp } from '~/app/AppContext';
import { useFeedback } from '~/ui/feedback/FeedbackProvider';
import FirstRunWizard from '~/ui/screens/FirstRunWizard';
import AwardScreen from '~/ui/screens/AwardScreen';
import LeaderboardScreen from '~/ui/screens/LeaderboardScreen';
import ClassOverviewScreen from '~/ui/screens/ClassOverviewScreen';
import LogScreen from '~/ui/screens/LogScreen';
import ManageScreen from '~/ui/screens/ManageScreen';
import InfoScreen from '~/ui/screens/InfoScreen';
import CommandPalette from '~/ui/shortcut/CommandPalette';
import HelpOverlay from '~/ui/shortcut/HelpOverlay';
import { useKeydown } from '~/ui/shortcut/KeyScope';
import SeasonResetDialog from '~/ui/dialogs/SeasonResetDialog';
import {
  EVENT_CLEAR_SELECTION,
  EVENT_NAVIGATE_TAB,
  EVENT_SELECT_ALL,
  EVENT_UNDO_PERFORMED,
} from '~/ui/shortcut/events';

type Tab = 'award' | 'leaderboard' | 'overview' | 'log' | 'manage' | 'info';

const TABS: Array<{ id: Tab; label: string; aria: string }> = [
  { id: 'award', label: 'Vergeben', aria: 'XP vergeben' },
  { id: 'leaderboard', label: 'Leaderboard', aria: 'Leaderboard anzeigen' },
  { id: 'overview', label: 'Überblick', aria: 'Klassenüberblick anzeigen' },
  { id: 'log', label: 'Protokoll', aria: 'Aktivitätsprotokoll öffnen' },
  { id: 'manage', label: 'Verwalten', aria: 'Schüler und Quests verwalten' },
  { id: 'info', label: 'Info', aria: 'Info & Hilfe anzeigen' },
];

export default function App() {
  const { state, dispatch } = useApp();
  const feedback = useFeedback();
  const [tab, setTab] = useState<Tab>('award');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const hasManagedData = useMemo(
    () => state.students.length > 0 || state.quests.length > 0 || state.logs.length > 0,
    [state.students, state.quests, state.logs],
  );

  useEffect(() => {
    if (!state.settings.onboardingCompleted && hasManagedData) {
      dispatch({ type: 'UPDATE_SETTINGS', updates: { onboardingCompleted: true } });
    }
  }, [dispatch, hasManagedData, state.settings.onboardingCompleted]);

  const shouldShowFirstRun = !state.settings.onboardingCompleted && !hasManagedData;

  useEffect(() => {
    if (shouldShowFirstRun) {
      setTab('award');
    }
  }, [shouldShowFirstRun]);

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: Tab }>).detail;
      if (!detail?.tab) {
        return;
      }
      setTab(detail.tab);
    };
    window.addEventListener(EVENT_NAVIGATE_TAB, handleNavigate as EventListener);
    return () => window.removeEventListener(EVENT_NAVIGATE_TAB, handleNavigate as EventListener);
  }, []);

  const closeOverlays = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen(false);
    setResetOpen(false);
  }, []);

  useKeydown(
    useCallback(
      (event: KeyboardEvent) => {
        const key = event.key;
        const lower = key.toLowerCase();
        const mod = event.metaKey || event.ctrlKey;

        if (paletteOpen || helpOpen || resetOpen) {
          if (key === 'Escape') {
            event.preventDefault();
            closeOverlays();
          }
          return;
        }

        if (mod && lower === 'k') {
          event.preventDefault();
          setPaletteOpen(true);
          return;
        }

        if (!mod && (key === '?' || (key === '/' && event.shiftKey))) {
          event.preventDefault();
          setHelpOpen(true);
          return;
        }

        if ((mod && lower === 'z') || (!mod && lower === 'u')) {
          event.preventDefault();
          dispatch({ type: 'UNDO_LAST' });
          window.dispatchEvent(new Event(EVENT_UNDO_PERFORMED));
          return;
        }

        if (!mod && lower === 'a' && tab === 'award') {
          event.preventDefault();
          window.dispatchEvent(new Event(EVENT_SELECT_ALL));
          return;
        }

        if (!mod && key === 'Escape' && tab === 'award') {
          event.preventDefault();
          window.dispatchEvent(new Event(EVENT_CLEAR_SELECTION));
          return;
        }

        if (!mod && /^[1-6]$/.test(key)) {
          event.preventDefault();
          const nextTabs: Tab[] = ['award', 'leaderboard', 'overview', 'log', 'manage', 'info'];
          setTab(nextTabs[Number(key) - 1]);
        }
      },
      [paletteOpen, helpOpen, resetOpen, closeOverlays, dispatch, tab],
    ),
  );

  const handleSeasonReset = useCallback(() => {
    dispatch({ type: 'RESET_SEASON' });
    setResetOpen(false);
    feedback.success('Saison zurückgesetzt');
  }, [dispatch, feedback]);

  const openSeasonReset = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen(false);
    setResetOpen(true);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-brand">{state.settings.className || 'ClassQuest'}</h1>
        <nav role="tablist" aria-label="Hauptnavigation" className="app-tabs">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              aria-label={item.aria}
              className="app-tab"
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {shouldShowFirstRun ? (
        <FirstRunWizard
          onDone={() => {
            setTab('manage');
          }}
        />
      ) : (
        <>
          {tab === 'award' && <AwardScreen />}
          {tab === 'leaderboard' && <LeaderboardScreen />}
          {tab === 'overview' && <ClassOverviewScreen />}
          {tab === 'log' && <LogScreen />}
          {tab === 'manage' && <ManageScreen onOpenSeasonReset={openSeasonReset} />}
          {tab === 'info' && <InfoScreen />}
        </>
      )}

      <div className="toast-region" aria-live="polite" aria-atomic="true" id="toast-region" />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        setTab={setTab}
        onOpenSeasonReset={openSeasonReset}
      />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <SeasonResetDialog open={resetOpen} onCancel={() => setResetOpen(false)} onConfirm={handleSeasonReset} />
    </div>
  );
}
