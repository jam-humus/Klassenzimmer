import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';
import type { Quest } from '~/types/models';

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}
function newQuest(
  name: string,
  xp: number,
  type: 'daily' | 'repeatable' | 'oneoff' = 'daily',
): Quest {
  return { id: makeId(), name, xp, type, target: 'individual', active: true };
}

type StudentRowProps = {
  id: string;
  alias: string;
  onSave: (id: string, alias: string) => void;
  onRemove: (id: string) => void;
};

const StudentRow = React.memo(function StudentRow({ id, alias, onSave, onRemove }: StudentRowProps) {
  const [value, setValue] = useState(alias);
  useEffect(() => setValue(alias), [alias]);

  const commit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === alias) {
      setValue(alias);
      return;
    }
    onSave(id, trimmed);
  }, [value, alias, onSave, id]);

  return (
    <li style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        aria-label={`Alias für ${alias} bearbeiten`}
        style={{ flex: 1, padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
      />
      <button type="button" onClick={commit} aria-label={`Alias von ${alias} speichern`} style={{ padding: '6px 12px' }}>
        Speichern
      </button>
      <button
        type="button"
        onClick={() => onRemove(id)}
        aria-label={`${alias} entfernen`}
        style={{ padding: '6px 12px' }}
      >
        Entfernen
      </button>
    </li>
  );
});

StudentRow.displayName = 'StudentRow';

type QuestRowProps = {
  quest: Quest;
  onSave: (id: string, updates: Partial<Pick<Quest, 'name' | 'xp' | 'type' | 'active'>>) => void;
  onRemove: (id: string) => void;
};

const QuestRow = React.memo(function QuestRow({ quest, onSave, onRemove }: QuestRowProps) {
  const [name, setName] = useState(quest.name);
  const [xp, setXp] = useState<number>(quest.xp);
  const [type, setType] = useState<Quest['type']>(quest.type);
  const [active, setActive] = useState<boolean>(quest.active);

  useEffect(() => setName(quest.name), [quest.name]);
  useEffect(() => setXp(quest.xp), [quest.xp]);
  useEffect(() => setType(quest.type), [quest.type]);
  useEffect(() => setActive(quest.active), [quest.active]);

  const commit = useCallback(() => {
    onSave(quest.id, { name: name.trim() || quest.name, xp: Math.max(0, xp), type, active });
  }, [onSave, quest.id, name, xp, type, active, quest.name]);

  return (
    <li style={{ display: 'grid', gridTemplateColumns: '2fr 100px 120px auto auto', gap: 8, alignItems: 'center' }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        aria-label={`Quest ${quest.name} umbenennen`}
        style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
      />
      <input
        type="number"
        value={xp}
        min={0}
        onChange={(e) => setXp(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
        onBlur={commit}
        aria-label={`XP für ${quest.name}`}
        style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
      />
      <select
        value={type}
        onChange={(e) => {
          const next = e.target.value as Quest['type'];
          setType(next);
          onSave(quest.id, { type: next });
        }}
        aria-label={`Questtyp für ${quest.name}`}
        style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
      >
        <option value="daily">daily</option>
        <option value="repeatable">repeatable</option>
        <option value="oneoff">oneoff</option>
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => {
            const checked = e.target.checked;
            setActive(checked);
            onSave(quest.id, { active: checked });
          }}
          aria-label={`${quest.name} aktiv schalten`}
        />
        Aktiv
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" onClick={commit} aria-label={`Quest ${quest.name} speichern`} style={{ padding: '6px 12px' }}>
          Speichern
        </button>
        <button
          type="button"
          onClick={() => onRemove(quest.id)}
          aria-label={`Quest ${quest.name} löschen`}
          style={{ padding: '6px 12px' }}
        >
          Löschen
        </button>
      </div>
    </li>
  );
});

QuestRow.displayName = 'QuestRow';

export default function ManageScreen() {
  const { state, dispatch } = useApp();
  const [alias, setAlias] = useState('');
  const [qName, setQName] = useState('Hausaufgaben');
  const [qXP, setQXP] = useState(10);
  const [qType, setQType] = useState<'daily' | 'repeatable' | 'oneoff'>('daily');

  const addStudent = useCallback(() => {
    if (!alias.trim()) return;
    dispatch({ type: 'ADD_STUDENT', alias: alias.trim() });
    setAlias('');
  }, [alias, dispatch]);

  const populateStudents = useCallback(() => {
    for (let i = 1; i <= 30; i++) {
      dispatch({ type: 'ADD_STUDENT', alias: `S${String(i).padStart(2, '0')}` });
    }
  }, [dispatch]);

  const addQuest = useCallback(() => {
    if (!qName.trim()) return;
    dispatch({ type: 'ADD_QUEST', quest: newQuest(qName.trim(), qXP, qType) });
  }, [dispatch, qName, qXP, qType]);

  const populateQuests = useCallback(() => {
    const presets = Array.from({ length: 15 }, (_, i) =>
      newQuest(`Quest ${i + 1}`, 5 + ((i * 5) % 30), (i % 3 === 0 ? 'daily' : i % 3 === 1 ? 'repeatable' : 'oneoff')),
    );
    presets.forEach((quest) => dispatch({ type: 'ADD_QUEST', quest }));
  }, [dispatch]);

  const onUpdateStudent = useCallback(
    (id: string, nextAlias: string) => dispatch({ type: 'UPDATE_STUDENT_ALIAS', id, alias: nextAlias }),
    [dispatch],
  );
  const onRemoveStudent = useCallback((id: string) => dispatch({ type: 'REMOVE_STUDENT', id }), [dispatch]);
  const onUpdateQuest = useCallback(
    (id: string, updates: Partial<Pick<Quest, 'name' | 'xp' | 'type' | 'active'>>) =>
      dispatch({ type: 'UPDATE_QUEST', id, updates }),
    [dispatch],
  );
  const onRemoveQuest = useCallback((id: string) => dispatch({ type: 'REMOVE_QUEST', id }), [dispatch]);

  const sortedQuests = useMemo(() => [...state.quests].sort((a, b) => a.name.localeCompare(b.name)), [state.quests]);
  const sortedStudents = useMemo(() => [...state.students].sort((a, b) => a.alias.localeCompare(b.alias)), [state.students]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Schüler verwalten</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            aria-label="Neuen Schüleralias"
            placeholder="Alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addStudent();
            }}
            style={{ flex: 1, minWidth: 180, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          />
          <button type="button" onClick={addStudent} style={{ padding: '10px 16px' }}>
            Hinzufügen
          </button>
          <button type="button" onClick={populateStudents} style={{ padding: '10px 16px' }}>
            Demo: 30 Schüler
          </button>
        </div>
        <ul style={{ display: 'grid', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
          {sortedStudents.map((s) => (
            <StudentRow key={s.id} id={s.id} alias={s.alias} onSave={onUpdateStudent} onRemove={onRemoveStudent} />
          ))}
        </ul>
      </section>

      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Quests verwalten</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            aria-label="Questname"
            value={qName}
            onChange={(e) => setQName(e.target.value)}
            style={{ flex: 2, minWidth: 160, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          />
          <input
            aria-label="XP"
            type="number"
            min={0}
            value={qXP}
            onChange={(e) => setQXP(Number.parseInt(e.target.value, 10) || 0)}
            style={{ width: 100, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          />
          <select
            aria-label="Questtyp"
            value={qType}
            onChange={(e) => setQType(e.target.value as typeof qType)}
            style={{ minWidth: 140, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          >
            <option value="daily">daily</option>
            <option value="repeatable">repeatable</option>
            <option value="oneoff">oneoff</option>
          </select>
          <button type="button" onClick={addQuest} style={{ padding: '10px 16px' }}>
            Quest anlegen
          </button>
          <button type="button" onClick={populateQuests} style={{ padding: '10px 16px' }}>
            Demo: 15 Quests
          </button>
        </div>
        <ul style={{ display: 'grid', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
          {sortedQuests.map((quest) => (
            <QuestRow key={quest.id} quest={quest} onSave={onUpdateQuest} onRemove={onRemoveQuest} />
          ))}
        </ul>
      </section>
    </div>
  );
}
