import React, { useState } from 'react';
import { useApp } from '~/app/AppContext';
import FirstRunWizard from '~/ui/screens/FirstRunWizard';
import AwardScreen from '~/ui/screens/AwardScreen';
import LeaderboardScreen from '~/ui/screens/LeaderboardScreen';
import LogScreen from '~/ui/screens/LogScreen';
import ManageScreen from '~/ui/screens/ManageScreen';

type Tab = 'award' | 'leaderboard' | 'log' | 'manage';

const TAB_LABELS: Record<Tab, string> = {
  award: 'Vergeben',
  leaderboard: 'Leaderboard',
  log: 'Protokoll',
  manage: 'Verwalten',
};

export default function App(){
  const { state } = useApp();
  const [tab, setTab] = useState<Tab>('award');
  const shouldShowFirstRun =
    !state.settings.onboardingCompleted &&
    state.students.length === 0 &&
    state.quests.length === 0 &&
    state.logs.length === 0;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <h1 style={{ margin:0 }}>{state.settings.className || 'ClassQuest'}</h1>
        <nav role="tablist" aria-label="Hauptnavigation" style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {(['award', 'leaderboard', 'log', 'manage'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                border: tab === t ? '2px solid var(--color-primary)' : '1px solid transparent',
                background: tab === t ? 'rgba(91,141,239,0.15)' : 'rgba(148,163,184,0.12)',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {TAB_LABELS[t]}
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
          {tab==='award' && <AwardScreen />}
          {tab==='leaderboard' && <LeaderboardScreen />}
          {tab==='log' && <LogScreen />}
          {tab==='manage' && <ManageScreen />}
        </>
      )}

      <div aria-live="polite" aria-atomic="true" id="toast-region" />
    </div>
  );
}
