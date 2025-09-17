import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { useApp } from '~/app/AppContext';
import FirstRunWizard from '~/ui/screens/FirstRunWizard';
import AwardScreen from '~/ui/screens/AwardScreen';
import LeaderboardScreen from '~/ui/screens/LeaderboardScreen';
import LogScreen from '~/ui/screens/LogScreen';
import ManageScreen from '~/ui/screens/ManageScreen';

type Tab = 'award' | 'leaderboard' | 'log' | 'manage';

const TABS: Array<{ id: Tab; label: string; aria: string }> = [
  { id: 'award', label: 'Vergeben', aria: 'XP vergeben' },
  { id: 'leaderboard', label: 'Leaderboard', aria: 'Leaderboard anzeigen' },
  { id: 'log', label: 'Protokoll', aria: 'Aktivitätsprotokoll öffnen' },
  { id: 'manage', label: 'Verwalten', aria: 'Schüler und Quests verwalten' },
];

export default function App() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<Tab>('award');

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
          {tab === 'log' && <LogScreen />}
          {tab === 'manage' && <ManageScreen />}
        </>
      )}

      <div className="toast-region" aria-live="polite" aria-atomic="true" id="toast-region" />
    </div>
  );
}
