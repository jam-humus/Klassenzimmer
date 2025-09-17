import React, { useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';
import type { Quest, QuestType } from '~/types/models';

const questTypes: QuestType[] = ['daily', 'repeatable', 'oneoff'];

const createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

function makeQuest(name: string, xp: number, type: QuestType = 'daily'): Quest {
  return {
    id: createId(),
    name: name.trim() || 'Neue Quest',
    xp: Number.isFinite(xp) ? Math.max(0, Math.round(xp)) : 0,
    type,
    target: 'individual',
    active: true,
  };
}

type StudentRowProps = {
  id: string;
  alias: string;
  onRename: (id: string, alias: string) => void;
  onRemove: (id: string) => void;
};

const StudentRow = React.memo(function StudentRow({ id, alias, onRename, onRemove }: StudentRowProps) {
  const [draft, setDraft] = useState(alias);

  React.useEffect(() => {
    setDraft(alias);
  }, [alias]);

  const submit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== alias) {
      onRename(id, trimmed);
    }
    setDraft(trimmed || alias);
  };

  return (
    <li style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={submit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
        }}
        aria-label={`Alias von ${alias} bearbeiten`}
      />
      <button type="button" onClick={() => onRemove(id)} aria-label={`${alias} entfernen`}>
        Entfernen
      </button>
    </li>
  );
});
StudentRow.displayName = 'StudentRow';

type QuestRowProps = {
  quest: Quest;
  onUpdate: (id: string, updates: Pick<Quest, 'name' | 'xp' | 'type'>) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

const QuestRow = React.memo(function QuestRow({ quest, onUpdate, onToggle, onRemove }: QuestRowProps) {
  const [name, setName] = useState(quest.name);
  const [xp, setXP] = useState(quest.xp.toString());
  const [type, setType] = useState<QuestType>(quest.type);

  React.useEffect(() => {
    setName(quest.name);
    setXP(String(quest.xp));
    setType(quest.type);
  }, [quest.id, quest.name, quest.type, quest.xp]);

  const commit = () => {
    const trimmed = name.trim();
    const parsedXP = Number.parseInt(xp, 10);
    const cleanXP = Number.isFinite(parsedXP) ? Math.max(0, parsedXP) : quest.xp;
    if (!trimmed) {
      setName(quest.name);
      setXP(String(quest.xp));
      setType(quest.type);
      return;
    }
    if (trimmed !== name) {
      setName(trimmed);
    }
    setXP(String(cleanXP));
    if (trimmed !== quest.name || cleanXP !== quest.xp || type !== quest.type) {
      onUpdate(quest.id, { name: trimmed, xp: cleanXP, type });
    }
  };

  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(160px, 1fr) 110px 140px auto auto',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
        }}
        aria-label={`${quest.name} umbenennen`}
      />
      <input
        type="number"
        min={0}
        value={xp}
        onChange={(event) => setXP(event.target.value)}
        onBlur={commit}
        aria-label={`${quest.name} XP Wert`}
      />
      <select
        value={type}
        onChange={(event) => {
          const nextType = event.target.value as QuestType;
          setType(nextType);
          const parsedXP = Number.parseInt(xp, 10);
          const safeXP = Number.isFinite(parsedXP) ? Math.max(0, parsedXP) : quest.xp;
          setXP(String(safeXP));
          onUpdate(quest.id, { name: name.trim() || quest.name, xp: safeXP, type: nextType });
        }}
        aria-label={`${quest.name} Typ`}
      >
        {questTypes.map((qt) => (
          <option key={qt} value={qt}>
            {qt}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => onToggle(quest.id)} aria-pressed={quest.active}>
        {quest.active ? 'Aktiv' : 'Inaktiv'}
      </button>
      <button type="button" onClick={() => onRemove(quest.id)} aria-label={`${quest.name} löschen`}>
        Löschen
      </button>
    </li>
  );
});
QuestRow.displayName = 'QuestRow';

export default function ManageScreen() {
  const { state, dispatch } = useApp();
  const [alias, setAlias] = useState('');
  const [questName, setQuestName] = useState('Hausaufgaben');
  const [questXP, setQuestXP] = useState(10);
  const [questType, setQuestType] = useState<QuestType>('daily');

  const sortedStudents = useMemo(() => [...state.students].sort((a, b) => a.alias.localeCompare(b.alias)), [state.students]);
  const quests = state.quests;

  const handleAddStudent = () => {
    const trimmed = alias.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_STUDENT', alias: trimmed });
    setAlias('');
  };

  const handleAddQuest = () => {
    if (!questName.trim()) return;
    dispatch({ type: 'ADD_QUEST', quest: makeQuest(questName, questXP, questType) });
    setQuestName('');
  };

  const populateDemoStudents = () => {
    const demoAliases = Array.from({ length: 30 }, (_, index) => `S${String(index + 1).padStart(2, '0')}`);
    demoAliases.forEach((demo) => dispatch({ type: 'ADD_STUDENT', alias: demo }));
  };

  const populateDemoQuests = () => {
    const presets = Array.from({ length: 15 }, (_, index) => {
      const xp = 5 + ((index * 5) % 35);
      const type = questTypes[index % questTypes.length];
      return makeQuest(`Quest ${index + 1}`, xp, type);
    });
    presets.forEach((quest) => dispatch({ type: 'ADD_QUEST', quest }));
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section style={{ background: '#fff', padding: 16, borderRadius: 16, display: 'grid', gap: 16 }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Schüler</h2>
          <button type="button" onClick={populateDemoStudents} style={{ marginLeft: 'auto' }}>
            Demo: 30 Schüler
          </button>
        </header>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            aria-label="Neuer Alias"
            placeholder="Alias"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddStudent();
              }
            }}
          />
          <button type="button" onClick={handleAddStudent}>
            Hinzufügen
          </button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
          {sortedStudents.length === 0 && <li>Keine Schüler vorhanden.</li>}
          {sortedStudents.map((student) => (
            <StudentRow
              key={student.id}
              id={student.id}
              alias={student.alias}
              onRename={(id, nextAlias) => dispatch({ type: 'UPDATE_STUDENT_ALIAS', id, alias: nextAlias })}
              onRemove={(id) => dispatch({ type: 'REMOVE_STUDENT', id })}
            />
          ))}
        </ul>
      </section>

      <section style={{ background: '#fff', padding: 16, borderRadius: 16, display: 'grid', gap: 16 }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Quests</h2>
          <button type="button" onClick={populateDemoQuests} style={{ marginLeft: 'auto' }}>
            Demo: 15 Quests
          </button>
        </header>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            aria-label="Questname"
            value={questName}
            onChange={(event) => setQuestName(event.target.value)}
          />
          <input
            aria-label="Quest XP"
            type="number"
            min={0}
            value={questXP}
            onChange={(event) => setQuestXP(Number.parseInt(event.target.value || '0', 10))}
          />
          <select
            aria-label="Quest Typ"
            value={questType}
            onChange={(event) => setQuestType(event.target.value as QuestType)}
          >
            {questTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleAddQuest}>
            Quest anlegen
          </button>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
          {quests.length === 0 && <li>Keine Quests angelegt.</li>}
          {quests.map((quest) => (
            <QuestRow
              key={quest.id}
              quest={quest}
              onUpdate={(id, updates) => dispatch({ type: 'UPDATE_QUEST', id, updates })}
              onToggle={(id) => dispatch({ type: 'TOGGLE_QUEST', id })}
              onRemove={(id) => dispatch({ type: 'REMOVE_QUEST', id })}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
