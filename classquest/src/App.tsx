import { useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';
import type { ID, Quest } from '~/types/models';

type SimpleQuestType = 'daily' | 'repeatable' | 'oneoff';

function newQuest(name: string, xp: number, type: SimpleQuestType = 'daily'): Quest {
  const trimmed = name.trim();
  const id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return { id, name: trimmed || 'Neue Quest', xp, type, target: 'individual', active: true };
}

export default function App() {
  const { state, dispatch } = useApp();
  const [alias, setAlias] = useState('');
  const [qName, setQName] = useState('Hausaufgaben');
  const [qXP, setQXP] = useState(10);
  const [qType, setQType] = useState<SimpleQuestType>('daily');

  const activeQuests = useMemo(() => state.quests.filter((q) => q.active), [state.quests]);
  const studentAliasById = useMemo(
    () =>
      Object.fromEntries(state.students.map((student) => [student.id, student.alias])) as Record<
        ID,
        string
      >,
    [state.students],
  );

  const handleAddQuest = () => {
    const trimmed = qName.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_QUEST', quest: newQuest(trimmed, qXP, qType) });
    setQName('');
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>{state.settings.className || 'ClassQuest'}</h1>

      {/* Students */}
      <section style={{ padding: 12, background: '#fff', borderRadius: 12, marginBottom: 16 }}>
        <h2>Students</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            aria-label="Alias"
            placeholder="Alias"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
          />
          <button
            onClick={() => {
              if (alias.trim()) {
                dispatch({ type: 'ADD_STUDENT', alias: alias.trim() });
                setAlias('');
              }
            }}
          >
            Add
          </button>
        </div>
        <ul>
          {state.students.map((student) => (
            <li key={student.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <strong>{student.alias}</strong> — {student.xp} XP (Lvl {student.level})
              <button onClick={() => dispatch({ type: 'REMOVE_STUDENT', id: student.id })}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Quests */}
      <section style={{ padding: 12, background: '#fff', borderRadius: 12, marginBottom: 16 }}>
        <h2>Quests</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input
            aria-label="Quest name"
            placeholder="Quest name"
            value={qName}
            onChange={(event) => setQName(event.target.value)}
          />
          <input
            aria-label="XP"
            type="number"
            min={0}
            value={qXP}
            onChange={(event) => setQXP(Number.parseInt(event.target.value || '0', 10))}
          />
          <select
            aria-label="Type"
            value={qType}
            onChange={(event) => setQType(event.target.value as SimpleQuestType)}
          >
            <option value="daily">daily</option>
            <option value="repeatable">repeatable</option>
            <option value="oneoff">oneoff</option>
          </select>
          <button onClick={handleAddQuest}>Add quest</button>
        </div>
        <ul>
          {state.quests.map((quest) => (
            <li key={quest.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>
                {quest.name} — {quest.xp} XP [{quest.type}]
              </span>
              <button onClick={() => dispatch({ type: 'TOGGLE_QUEST', id: quest.id })}>
                {quest.active ? 'Disable' : 'Enable'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Award */}
      <section style={{ padding: 12, background: '#fff', borderRadius: 12, marginBottom: 16 }}>
        <h2>Award</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 8,
          }}
        >
          {state.students.map((student) => (
            <div
              key={student.id}
              style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}
            >
              <strong>{student.alias}</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {activeQuests.length === 0 && <em>No active quests</em>}
                {activeQuests.map((quest) => (
                  <button
                    key={quest.id}
                    onClick={() => dispatch({ type: 'AWARD', studentId: student.id, quest })}
                  >
                    +{quest.xp} {quest.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={() => dispatch({ type: 'UNDO_LAST' })}>Undo last award</button>
        </div>
      </section>

      {/* Log */}
      <section style={{ padding: 12, background: '#fff', borderRadius: 12 }}>
        <h2>Recent Log</h2>
        <ol>
          {state.logs.slice(0, 10).map((log) => (
            <li key={log.id}>
              {new Date(log.timestamp).toLocaleTimeString()} — {log.questName} →{' '}
              {studentAliasById[log.studentId] ?? log.studentId} (+{log.xp} XP)
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
