import React, { useEffect, useMemo, useState } from 'react';
import './App.css'; // Stellt sicher, dass du eine App.css Datei für das Styling hast
import { useApp } from '~/app/AppContext';
import FirstRunWizard from '~/ui/screens/FirstRunWizard';
import AwardScreen from '~/ui/screens/AwardScreen';
import LeaderboardScreen from '~/ui/screens/LeaderboardScreen';
import LogScreen from '~/ui/screens/LogScreen';
import ManageScreen from '~/ui/screens/ManageScreen';

type Tab = 'award' | 'leaderboard' | 'log' | 'manage';

// Ein Array von Objekten für die Tabs, was für mehr Flexibilität sorgt (z.B. für aria-labels)
const TABS: Array<{ id: Tab; label: string; aria: string }> = [
  { id: 'award', label: 'Vergeben', aria: 'XP vergeben' },
  { id: 'leaderboard', label: 'Leaderboard', aria: 'Leaderboard anzeigen' },
  { id: 'log', label: 'Protokoll', aria: 'Aktivitätsprotokoll öffnen' },
  { id: 'manage', label: 'Verwalten', aria: 'Schüler und Quests verwalten' },
];

export default function App() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<Tab>('award');

  // Eine robustere Prüfung, ob bereits Daten verwaltet werden
  const hasManagedData = useMemo(
    () => state.students.length > 0 || state.quests.length > 0 || state.logs.length > 0,
    [state.students, state.quests, state.logs],
  );

  // Effekt, um das Onboarding automatisch als abgeschlossen zu markieren, wenn Daten vorhanden sind
  useEffect(() => {
    if (!state.settings.onboardingCompleted && hasManagedData) {
      dispatch({ type: 'UPDATE_SETTINGS', updates: { onboardingCompleted: true } });
    }
  }, [dispatch, hasManagedData, state.settings.onboardingCompleted]);

  // Bestimmt, ob der Einrichtungs-Assistent (FirstRunWizard) angezeigt werden soll
  const shouldShowFirstRun = !state.settings.onboardingCompleted && !hasManagedData;

  // Setzt den Tab zurück auf 'award', falls der FirstRunWizard wieder aktiv wird
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
            // Nach Abschluss des Wizards zum "Verwalten"-Tab wechseln
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

      {/* Region für Benachrichtigungen (Toasts) */}
      <div className="toast-region" aria-live="polite" aria-atomic="true" id="toast-region" />
    </div>
  );
}