import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { StudentTile } from '~/ui/components/StudentTile';
import { useSelection } from '~/ui/hooks/useSelection';
import { useUndoToast } from '~/ui/hooks/useUndoToast';
import type { Quest } from '~/types/models';

const TILE_MIN_WIDTH = 240;

export default function AwardScreen() {
  const { state, dispatch } = useApp();
  const quests = useMemo(() => state.quests.filter((q) => q.active), [state.quests]);
  const { selected, isSelected, toggle, clear, setMany } = useSelection<string>([]);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [columns, setColumns] = useState(3);
  const gridRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Array<HTMLDivElement | null>>([]);
  const { message, setMessage, clear: clearToast } = useUndoToast();

  const students = state.students;
  const aliasById = useMemo(() => new Map(students.map((s) => [s.id, s.alias])), [students]);
  const activeQuest = useMemo(() => quests.find((q) => q.id === activeQuestId) ?? quests[0] ?? null, [quests, activeQuestId]);

  useEffect(() => {
    if (!quests.length) {
      setActiveQuestId(null);
      return;
    }
    if (!activeQuestId || !quests.some((q) => q.id === activeQuestId)) {
      setActiveQuestId(quests[0].id);
    }
  }, [quests, activeQuestId]);

  const computeColumns = useCallback(() => {
    if (typeof window === 'undefined') return;
    const width = gridRef.current?.clientWidth ?? window.innerWidth;
    const next = Math.max(2, Math.min(5, Math.floor(width / TILE_MIN_WIDTH)));
    setColumns(next || 2);
  }, []);

  useEffect(() => {
    computeColumns();
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', computeColumns);
    return () => window.removeEventListener('resize', computeColumns);
  }, [computeColumns]);

  useEffect(() => {
    computeColumns();
  }, [students.length, computeColumns]);

  useEffect(() => {
    if (focusedIdx >= students.length) {
      setFocusedIdx(students.length ? students.length - 1 : 0);
    }
  }, [students.length, focusedIdx]);

  useEffect(() => {
    const node = tileRefs.current[focusedIdx];
    if (node) {
      node.focus({ preventScroll: true });
    }
  }, [focusedIdx, students.length]);

  useEffect(() => {
    tileRefs.current = tileRefs.current.slice(0, students.length);
  }, [students.length]);

  const setFocus = useCallback(
    (updater: (current: number) => number) => {
      setFocusedIdx((prev) => {
        const next = updater(prev);
        return Math.min(Math.max(next, 0), Math.max(0, students.length - 1));
      });
    },
    [students.length],
  );

  const showUndoToast = useCallback(
    (quest: Quest, target: string) => {
      setMessage(`${quest.name} an ${target} vergeben. Drücke U zum Rückgängig machen.`);
    },
    [setMessage],
  );

  const awardStudent = useCallback(
    (studentId: string, quest: Quest) => {
      dispatch({ type: 'AWARD', studentId, quest });
    },
    [dispatch],
  );

  const awardSelected = useCallback(() => {
    if (!activeQuest) return;
    const ids = students.filter((s) => selected.has(s.id)).map((s) => s.id);
    if (!ids.length) return;
    ids.forEach((id) => awardStudent(id, activeQuest));
    const target = ids.length === 1 ? aliasById.get(ids[0]) ?? 'Schüler' : `${ids.length} Schüler`;
    showUndoToast(activeQuest, target);
  }, [activeQuest, students, selected, awardStudent, aliasById, showUndoToast]);

  const awardSingle = useCallback(
    (studentId: string, quest: Quest) => {
      awardStudent(studentId, quest);
      const target = aliasById.get(studentId) ?? 'Schüler';
      showUndoToast(quest, target);
    },
    [awardStudent, aliasById, showUndoToast],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!students.length) return;
      const rowLen = columns || 1;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          setFocus((i) => i + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocus((i) => i - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocus((i) => i + rowLen);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocus((i) => i - rowLen);
          break;
        case 'Enter':
          if (activeQuest) {
            e.preventDefault();
            const student = students[focusedIdx];
            if (student) {
              awardSingle(student.id, activeQuest);
            }
          }
          break;
        default:
          if (e.key.toLowerCase() === 'u') {
            e.preventDefault();
            dispatch({ type: 'UNDO_LAST' });
            clearToast();
          }
          break;
      }
    },
    [students, columns, activeQuest, awardSingle, focusedIdx, dispatch, setFocus, clearToast],
  );

  const selectAll = useCallback(() => setMany(students.map((s) => s.id)), [students, setMany]);

  const selectedCount = selected.size;

  return (
    <div onKeyDown={onKeyDown}>
      <div style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '12px 0', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div role="radiogroup" aria-label="Aktive Quest" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {quests.length ? (
              quests.map((q) => (
                <button
                  type="button"
                  key={q.id}
                  role="radio"
                  aria-checked={activeQuest?.id === q.id}
                  onClick={() => setActiveQuestId(q.id)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 999,
                    border: activeQuest?.id === q.id ? '2px solid var(--color-primary)' : '1px solid #cbd5f5',
                    background: activeQuest?.id === q.id ? 'rgba(91,141,239,0.12)' : '#fff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  +{q.xp} {q.name}
                </button>
              ))
            ) : (
              <em>Keine aktiven Quests</em>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={awardSelected}
              disabled={!activeQuest || selectedCount === 0}
              aria-disabled={!activeQuest || selectedCount === 0}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                background: 'var(--color-primary)',
                color: '#fff',
                fontWeight: 600,
                border: 'none',
                minWidth: 200,
                cursor: !activeQuest || selectedCount === 0 ? 'not-allowed' : 'pointer',
                opacity: !activeQuest || selectedCount === 0 ? 0.6 : 1,
              }}
            >
              Allen ausgewählten vergeben
            </button>
            <span aria-live="polite" style={{ fontWeight: 600 }}>
              Ausgewählt: {selectedCount}
            </span>
            <button type="button" onClick={selectAll} aria-label="Alle Schüler auswählen">
              Alle auswählen
            </button>
            <button type="button" onClick={clear} aria-label="Auswahl leeren">
              Auswahl leeren
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'UNDO_LAST' })}
              aria-label="Letzte Vergabe rückgängig machen"
            >
              Undo
            </button>
          </div>
        </div>
      </div>

      <div
        ref={gridRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.max(1, columns)}, minmax(220px, 1fr))`,
          gap: 14,
          alignItems: 'stretch',
          paddingTop: 12,
        }}
      >
        {students.map((s, idx) => (
          <div
            key={s.id}
            onFocusCapture={() => setFocusedIdx(idx)}
            style={{
              outline: idx === focusedIdx ? '3px solid rgba(0,194,255,0.6)' : 'none',
              borderRadius: 16,
              transition: 'outline 0.1s ease-in-out',
            }}
          >
            <StudentTile
              ref={(node) => {
                tileRefs.current[idx] = node;
              }}
              id={s.id}
              alias={s.alias}
              xp={s.xp}
              level={s.level}
              selected={isSelected(s.id)}
              onSelect={toggle}
            >
              {quests.map((q) => (
                <button
                  type="button"
                  key={q.id}
                  onClick={() => awardSingle(s.id, q)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 999,
                    border: '1px solid #dbe3f4',
                    background: '#f8fbff',
                    cursor: 'pointer',
                  }}
                  aria-label={`${q.name} an ${s.alias} vergeben`}
                >
                  +{q.xp}
                </button>
              ))}
            </StudentTile>
          </div>
        ))}
      </div>

      {message && (
        <div
          role="status"
          aria-live="assertive"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1e293b',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 12,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.35)',
            zIndex: 5,
          }}
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'UNDO_LAST' });
              clearToast();
            }}
            style={{
              background: '#fff',
              color: '#1e293b',
              borderRadius: 8,
              padding: '6px 12px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Rückgängig
          </button>
        </div>
      )}
    </div>
  );
}
