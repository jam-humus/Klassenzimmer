import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '~/app/AppContext';
import type { AppState, ID, Quest, QuestType, Student, Team } from '~/types/models';
import AsyncButton from '~/ui/feedback/AsyncButton';
import { useFeedback } from '~/ui/feedback/FeedbackProvider';

const questTypes: QuestType[] = ['daily', 'repeatable', 'oneoff'];

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function newQuest(
  name: string,
  xp: number,
  type: 'daily' | 'repeatable' | 'oneoff' = 'daily',
): Quest {
  return {
    id: makeId(),
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
      <AsyncButton
        type="button"
        onClick={commit}
        aria-label={`Alias von ${alias} speichern`}
        style={{ padding: '6px 12px' }}
      >
        Speichern
      </AsyncButton>
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
        {questTypes.map((qt) => (
          <option key={qt} value={qt}>
            {qt}
          </option>
        ))}
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
        <AsyncButton
          type="button"
          onClick={commit}
          aria-label={`Quest ${quest.name} speichern`}
          style={{ padding: '6px 12px' }}
        >
          Speichern
        </AsyncButton>
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

type GroupRowProps = {
  team: Team;
  students: Student[];
  onRename: (id: ID, name: string) => void;
  onRemove: (id: ID) => void;
  onSetMembers: (id: ID, memberIds: ID[]) => void;
};

const GroupRow = React.memo(function GroupRow({ team, students, onRename, onRemove, onSetMembers }: GroupRowProps) {
  const [name, setName] = useState(team.name);
  useEffect(() => setName(team.name), [team.name]);

  const commitName = useCallback(() => {
    const trimmed = name.trim();
    const nextName = trimmed || 'Gruppe';
    if (nextName === team.name) {
      if (name !== team.name) {
        setName(team.name);
      }
      return;
    }
    setName(nextName);
    onRename(team.id, nextName);
  }, [name, team.id, team.name, onRename]);

  const membersSet = useMemo(() => new Set(team.memberIds), [team.memberIds]);

  const toggleMember = useCallback(
    (studentId: ID) => {
      const hasMember = team.memberIds.includes(studentId);
      const nextMembers = hasMember
        ? team.memberIds.filter((id) => id !== studentId)
        : [...team.memberIds, studentId];
      onSetMembers(team.id, nextMembers);
    },
    [team.memberIds, team.id, onSetMembers],
  );

  return (
    <li style={{ display: 'grid', gap: 12, padding: 12, border: '1px solid #d0d7e6', borderRadius: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitName();
            }
          }}
          aria-label={`${team.name} umbenennen`}
          style={{ flex: 1, minWidth: 160, padding: '6px 8px', borderRadius: 8, border: '1px solid #d0d7e6' }}
        />
        <span style={{ fontSize: 12, opacity: 0.7 }}>Mitglieder: {team.memberIds.length}</span>
        <button type="button" onClick={() => onRemove(team.id)} aria-label={`${team.name} löschen`} style={{ padding: '6px 12px' }}>
          Löschen
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {students.length === 0 ? (
          <em>Keine Schüler vorhanden</em>
        ) : (
          students.map((student) => (
            <label key={student.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={membersSet.has(student.id)}
                onChange={() => toggleMember(student.id)}
                aria-label={`${student.alias} ${membersSet.has(student.id) ? 'aus Gruppe entfernen' : 'zur Gruppe hinzufügen'}`}
              />
              <span>{student.alias}</span>
            </label>
          ))
        )}
      </div>
    </li>
  );
});
GroupRow.displayName = 'GroupRow';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isAppStateLike = (value: unknown): value is Partial<AppState> => {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.students) || !Array.isArray(value.quests) || !Array.isArray(value.logs)) {
    return false;
  }
  if (value.teams != null && !Array.isArray(value.teams)) {
    return false;
  }
  if (value.settings != null && !isRecord(value.settings)) {
    return false;
  }
  return true;
};

export default function ManageScreen() {
  const { state, dispatch } = useApp();
  const feedback = useFeedback();
  const [alias, setAlias] = useState('');
  const [qName, setQName] = useState('Hausaufgaben');
  const [qXP, setQXP] = useState(10);
  const [qType, setQType] = useState<'daily' | 'repeatable' | 'oneoff'>('daily');
  const [groupName, setGroupName] = useState('Team A');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addStudent = useCallback(() => {
    const trimmed = alias.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_STUDENT', alias: trimmed });
    setAlias('');
    feedback.success('Schüler gespeichert');
  }, [alias, dispatch, feedback]);

  const populateStudents = useCallback(() => {
    for (let i = 1; i <= 30; i++) {
      dispatch({ type: 'ADD_STUDENT', alias: `S${String(i).padStart(2, '0')}` });
    }
    feedback.info('30 Demo-Schüler hinzugefügt');
  }, [dispatch, feedback]);

  const addQuest = useCallback(() => {
    const trimmed = qName.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_QUEST', quest: newQuest(trimmed, qXP, qType) });
    feedback.success('Quest gespeichert');
  }, [dispatch, feedback, qName, qXP, qType]);

  const populateQuests = useCallback(() => {
    const presets = Array.from({ length: 15 }, (_, i) =>
      newQuest(`Quest ${i + 1}`, 5 + ((i * 5) % 30), (i % 3 === 0 ? 'daily' : i % 3 === 1 ? 'repeatable' : 'oneoff')),
    );
    presets.forEach((quest) => dispatch({ type: 'ADD_QUEST', quest }));
    feedback.info('15 Demo-Quests hinzugefügt');
  }, [dispatch, feedback]);

  const onUpdateStudent = useCallback(
    (id: string, nextAlias: string) => {
      dispatch({ type: 'UPDATE_STUDENT_ALIAS', id, alias: nextAlias });
      feedback.success('Schüler aktualisiert');
    },
    [dispatch, feedback],
  );
  const onRemoveStudent = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_STUDENT', id });
      feedback.success('Schüler entfernt');
    },
    [dispatch, feedback],
  );
  const onUpdateQuest = useCallback(
    (id: string, updates: Partial<Pick<Quest, 'name' | 'xp' | 'type' | 'active'>>) => {
      dispatch({ type: 'UPDATE_QUEST', id, updates });
      feedback.success('Quest aktualisiert');
    },
    [dispatch, feedback],
  );
  const onRemoveQuest = useCallback(
    (id: string) => {
      dispatch({ type: 'REMOVE_QUEST', id });
      feedback.success('Quest gelöscht');
    },
    [dispatch, feedback],
  );

  const addGroup = useCallback(() => {
    const trimmed = groupName.trim();
    if (!trimmed) return;
    dispatch({ type: 'ADD_GROUP', name: trimmed });
    setGroupName('');
    feedback.success('Gruppe erstellt');
  }, [dispatch, feedback, groupName]);
  const onRenameGroup = useCallback(
    (id: ID, name: string) => {
      dispatch({ type: 'RENAME_GROUP', id, name });
      feedback.success('Gruppe umbenannt');
    },
    [dispatch, feedback],
  );
  const onRemoveGroup = useCallback(
    (id: ID) => {
      dispatch({ type: 'REMOVE_GROUP', id });
      feedback.success('Gruppe gelöscht');
    },
    [dispatch, feedback],
  );
  const onSetGroupMembers = useCallback(
    (id: ID, memberIds: ID[]) => {
      dispatch({ type: 'SET_GROUP_MEMBERS', id, memberIds });
      feedback.info('Gruppenzugehörigkeit aktualisiert');
    },
    [dispatch, feedback],
  );

  const sortedStudents = useMemo(() => [...state.students].sort((a, b) => a.alias.localeCompare(b.alias)), [state.students]);
  const sortedQuests = useMemo(() => [...state.quests].sort((a, b) => a.name.localeCompare(b.name)), [state.quests]);
  const sortedTeams = useMemo(() => [...state.teams].sort((a, b) => a.name.localeCompare(b.name)), [state.teams]);

  const onExport = useCallback(() => {
    if (typeof window === 'undefined') {
      console.warn('Export is only available in the browser.');
      return;
    }
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `classquest-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    feedback.success('Daten exportiert');
  }, [state, feedback]);

  const onImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = typeof reader.result === 'string' ? reader.result : '';
          if (!text.trim()) {
            throw new Error('Leere Datei');
          }
          const parsed = JSON.parse(text);
          if (!isAppStateLike(parsed)) {
            throw new Error('Ungültige Datenstruktur');
          }
          const shouldOverwrite = typeof window === 'undefined' ? true : window.confirm('Bestehende Daten überschreiben?');
          if (!shouldOverwrite) {
            setImportError(null);
            return;
          }
          dispatch({ type: 'IMPORT', json: JSON.stringify(parsed) });
          setImportError(null);
          feedback.success('Daten importiert');
        } catch (error) {
          console.error('Import fehlgeschlagen', error);
          setImportError('Import fehlgeschlagen. Bitte überprüfe die Datei.');
          feedback.error('Import fehlgeschlagen. Bitte überprüfe die Datei.');
        } finally {
          input.value = '';
        }
      };
      reader.onerror = () => {
        console.error('Datei konnte nicht gelesen werden', reader.error);
        setImportError('Datei konnte nicht gelesen werden.');
        feedback.error('Datei konnte nicht gelesen werden.');
        input.value = '';
      };
      reader.readAsText(file);
    },
    [dispatch, feedback],
  );

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
          <AsyncButton type="button" onClick={() => addStudent()} style={{ padding: '10px 16px' }}>
            Hinzufügen
          </AsyncButton>
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
            {questTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <AsyncButton type="button" onClick={() => addQuest()} style={{ padding: '10px 16px' }}>
            Quest anlegen
          </AsyncButton>
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

      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Gruppen verwalten</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <input
            aria-label="Gruppenname"
            placeholder="z. B. Team Alpha"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addGroup();
              }
            }}
            style={{ flex: 1, minWidth: 180, padding: '8px 10px', borderRadius: 10, border: '1px solid #cbd5f5' }}
          />
          <AsyncButton type="button" onClick={() => addGroup()} style={{ padding: '10px 16px' }}>
            Gruppe anlegen
          </AsyncButton>
        </div>
        <ul style={{ display: 'grid', gap: 12, margin: 0, padding: 0, listStyle: 'none' }}>
          {sortedTeams.map((team) => (
            <GroupRow
              key={team.id}
              team={team}
              students={sortedStudents}
              onRename={onRenameGroup}
              onRemove={onRemoveGroup}
              onSetMembers={onSetGroupMembers}
            />
          ))}
          {sortedTeams.length === 0 && <em>Noch keine Gruppen angelegt.</em>}
        </ul>
      </section>


      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Einstellungen</h2>
        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(state.settings.allowNegativeXP)}
              onChange={(e) => {
                dispatch({ type: 'UPDATE_SETTINGS', updates: { allowNegativeXP: e.target.checked } });
                feedback.success('Einstellung gespeichert');
              }}
            />
            Negative XP erlauben (Shop kann unter 0 gehen)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(state.settings.sfxEnabled)}
              onChange={(e) => {
                dispatch({ type: 'UPDATE_SETTINGS', updates: { sfxEnabled: e.target.checked } });
                feedback.info(e.target.checked ? 'Soundeffekte aktiviert' : 'Soundeffekte deaktiviert');
              }}
            />
            Soundeffekte aktivieren
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={Boolean(state.settings.compactMode)}
              onChange={(e) => {
                dispatch({ type: 'UPDATE_SETTINGS', updates: { compactMode: e.target.checked } });
                feedback.info(e.target.checked ? 'Kompakte Ansicht aktiviert' : 'Kompakte Ansicht deaktiviert');
              }}
            />
            Kompakte Ansicht
          </label>
        </div>
      </section>
      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Backup &amp; Restore</h2>
        <p style={{ marginTop: 0, marginBottom: 12, fontSize: 14, color: '#475569' }}>
          Exportiere den aktuellen Klassenstand als JSON-Datei oder importiere eine Sicherung. Beim Import werden alle
          bestehenden Daten überschrieben.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <AsyncButton
            type="button"
            onClick={() => onExport()}
            style={{ padding: '10px 16px' }}
            busyLabel="Exportiere…"
            doneLabel="Exportiert"
          >
            Daten exportieren
          </AsyncButton>
          <AsyncButton
            type="button"
            onClick={() => {
              setImportError(null);
              fileInputRef.current?.click();
            }}
            style={{ padding: '10px 16px' }}
            busyLabel="Öffne…"
            doneLabel="Bereit"
          >
            Daten importieren
          </AsyncButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={onImportFile}
          />
          {importError && <span style={{ color: '#b91c1c', fontWeight: 600 }}>{importError}</span>}
        </div>
      </section>
    </div>
  );
}
