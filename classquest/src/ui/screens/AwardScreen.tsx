import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { StudentTile } from '~/ui/components/StudentTile';
import { useSelection } from '~/ui/hooks/useSelection';
import { useUndoToast } from '~/ui/hooks/useUndoToast';
import { useFeedback } from '~/ui/feedback/FeedbackProvider';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Quest, Team } from '~/types/models';

const TILE_MIN_WIDTH = 240;

type GroupChipProps = {
  team: Team;
  membersCount: number;
  disabled: boolean;
  onAward: (teamId: string) => void;
};

const GroupChip = React.memo(function GroupChip({ team, membersCount, disabled, onAward }: GroupChipProps) {
  return (
    <button
      type="button"
      onClick={() => onAward(team.id)}
      disabled={disabled || membersCount === 0}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        border: '1px solid #cbd5f5',
        background: disabled || membersCount === 0 ? '#f1f5f9' : '#f8fbff',
        fontWeight: 600,
        cursor: disabled || membersCount === 0 ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
      aria-label={`Quest an ${team.name} vergeben (${membersCount} Mitglieder)`}
    >
      <span>{team.name}</span>
      <span style={{ fontSize: 12, opacity: 0.7 }}>({membersCount})</span>
    </button>
  );
});
GroupChip.displayName = 'GroupChip';

export default function AwardScreen() {
  const { state, dispatch } = useApp();
  const feedback = useFeedback();
  const containerRef = useRef<HTMLDivElement>(null);
  const quests = useMemo(() => state.quests.filter((q) => q.active), [state.quests]);
  const { selected, isSelected, toggle, clear, setMany } = useSelection<string>([]);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [columns, setColumns] = useState(3);
  const [scrolled, setScrolled] = useState(false);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const pulseTimeoutRef = useRef<number | null>(null);
  const { message, setMessage, clear: clearToast } = useUndoToast();

  const students = state.students;
  const focusedStudent = students[focusedIdx];
  const studentIdSet = useMemo(() => new Set(students.map((student) => student.id)), [students]);
  const aliasById = useMemo(() => new Map(students.map((s) => [s.id, s.alias])), [students]);
  const virtualize = Boolean(state.settings.flags?.virtualize);
  const columnCount = Math.max(1, columns || 1);
  const rowCount = Math.ceil(students.length / columnCount);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 220,
    overscan: 5,
    enabled: virtualize,
  });
  const activeQuest = useMemo(
    () => quests.find((q) => q.id === activeQuestId) ?? quests[0] ?? null,
    [quests, activeQuestId],
  );

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
    const student = focusedStudent;
    if (!student) return;
    const tryFocus = () => {
      const node = tileRefs.current.get(student.id);
      if (node) {
        node.focus({ preventScroll: true });
        return true;
      }
      return false;
    };
    if (tryFocus()) return;
    if (virtualize) {
      const rowIndex = Math.floor(focusedIdx / columnCount);
      rowVirtualizer.scrollToIndex(rowIndex, { align: 'auto' });
      if (typeof window !== 'undefined') {
        const timeout = window.setTimeout(() => {
          tryFocus();
        }, 50);
        return () => window.clearTimeout(timeout);
      }
    }
  }, [focusedStudent, focusedIdx, virtualize, rowVirtualizer, columnCount]);

  useEffect(() => {
    const map = tileRefs.current;
    const validIds = new Set(students.map((student) => student.id));
    Array.from(map.keys()).forEach((id) => {
      if (!validIds.has(id)) {
        map.delete(id);
      }
    });
  }, [students]);

  useEffect(() => {
    if (!virtualize) return;
    rowVirtualizer.measure();
  }, [virtualize, columnCount, rowCount, rowVirtualizer]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handle = () => setScrolled(node.scrollTop > 0);
    handle();
    node.addEventListener('scroll', handle);
    return () => node.removeEventListener('scroll', handle);
  }, []);

  useEffect(() => () => {
    if (pulseTimeoutRef.current != null) {
      window.clearTimeout(pulseTimeoutRef.current);
    }
  }, []);

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

  const triggerPulse = useCallback((studentId: string) => {
    setPulseId(studentId);
    if (pulseTimeoutRef.current != null) {
      window.clearTimeout(pulseTimeoutRef.current);
    }
    pulseTimeoutRef.current = window.setTimeout(() => {
      setPulseId(null);
      pulseTimeoutRef.current = null;
    }, 320);
  }, []);

  const awardStudent = useCallback(
    (studentId: string, quest: Quest) => {
      dispatch({ type: 'AWARD', payload: { questId: quest.id, studentId } });
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
    feedback.success('Aktive Quest an Auswahl vergeben');
  }, [activeQuest, students, selected, awardStudent, aliasById, showUndoToast, feedback]);

  const awardSingle = useCallback(
    (studentId: string) => {
      if (!activeQuest) return;
      awardStudent(studentId, activeQuest);
      triggerPulse(studentId);
      const target = aliasById.get(studentId) ?? 'Schüler';
      feedback.success(`+${activeQuest.xp} XP an ${target}`);
      showUndoToast(activeQuest, target);
    },
    [activeQuest, awardStudent, aliasById, showUndoToast, feedback, triggerPulse],
  );

  const groups = useMemo(() => {
    if (!state.teams.length) return [] as Array<Team & { memberIds: string[] }>;
    return state.teams.map((team) => ({
      ...team,
      memberIds: team.memberIds.filter((memberId) => studentIdSet.has(memberId)),
    }));
  }, [state.teams, studentIdSet]);

  const awardGroup = useCallback(
    (teamId: string) => {
      if (!activeQuest) return;
      const team = groups.find((t) => t.id === teamId);
      if (!team) return;
      if (activeQuest.target === 'team') {
        dispatch({ type: 'AWARD', payload: { questId: activeQuest.id, teamId: team.id } });
        showUndoToast(activeQuest, team.name);
        feedback.success(`${activeQuest.name} an ${team.name}`);
        return;
      }
      const members = team.memberIds;
      if (!members.length) return;
      members.forEach((memberId) => awardStudent(memberId, activeQuest));
      const label = members.length > 1 ? `${team.name} (${members.length})` : team.name;
      showUndoToast(activeQuest, label);
      feedback.success(`${activeQuest.name} an ${label}`);
    },
    [activeQuest, groups, dispatch, awardStudent, showUndoToast, feedback],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!students.length) return;
      const rowLen = columnCount;
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
          e.preventDefault();
          if (activeQuest) {
            const student = students[focusedIdx];
            if (student) {
              awardSingle(student.id);
            }
          }
          break;
        default:
          if (e.key.toLowerCase() === 'u') {
            e.preventDefault();
            dispatch({ type: 'UNDO_LAST' });
            clearToast();
            feedback.info('Letzte Aktion rückgängig gemacht');
          }
          break;
      }
    },
    [students, columnCount, activeQuest, awardSingle, focusedIdx, dispatch, setFocus, clearToast, feedback],
  );

  const selectAll = useCallback(() => setMany(students.map((s) => s.id)), [students, setMany]);

  const selectedCount = selected.size;

  return (
    <div ref={containerRef} onKeyDown={onKeyDown} style={{ height: '100%', overflowY: 'auto', padding: '0 0 24px' }}>
      <div style={{ position: 'sticky', top: 0, background: '#f8fafc', padding: '12px 0', zIndex: 1, boxShadow: scrolled ? '0 8px 24px rgba(15, 23, 42, 0.12)' : 'none' }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            role="radiogroup"
            aria-label="Aktive Quest"
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}
          >
            {quests.length ? (
              quests.map((q) => {
                const isActive = activeQuest?.id === q.id;
                return (
                  <button
                    type="button"
                    key={q.id}
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setActiveQuestId(q.id)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 999,
                      border: isActive ? '2px solid var(--color-primary)' : '1px solid #cbd5f5',
                      background: isActive ? 'rgba(91,141,239,0.12)' : '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    +{q.xp} {q.name}
                  </button>
                );
              })
            ) : (
              <em>Keine aktiven Quests</em>
            )}
          </div>
          {groups.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>Gruppen:</span>
              {groups.map((team) => (
                <GroupChip
                  key={team.id}
                  team={team}
                  membersCount={team.memberIds.length}
                  disabled={!activeQuest}
                  onAward={awardGroup}
                />
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
              onClick={() => {
                dispatch({ type: 'UNDO_LAST' });
                clearToast();
                feedback.info('Letzte Aktion rückgängig gemacht');
              }}
              aria-label="Letzte Vergabe rückgängig machen"
            >
              Undo
            </button>
          </div>
        </div>
      </div>

      <div ref={gridRef} style={{ paddingTop: 12 }}>
        {virtualize ? (
          <div style={{ position: 'relative', height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const startIndex = virtualRow.index * columnCount;
              const rowStudents = students.slice(startIndex, startIndex + columnCount);
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingBottom: 14,
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${columnCount}, minmax(220px, 1fr))`,
                      gap: 14,
                    }}
                  >
                    {rowStudents.map((s, idxInRow) => {
                      const idx = startIndex + idxInRow;
                      return (
                        <div
                          key={s.id}
                          onFocusCapture={() => setFocusedIdx(idx)}
                          className={pulseId === s.id ? 'pulse' : undefined}
                          style={{
                            outline: idx === focusedIdx ? '3px solid rgba(0,194,255,0.6)' : 'none',
                            borderRadius: 16,
                            transition: 'outline 0.1s ease-in-out',
                          }}
                        >
                          <StudentTile
                            ref={(node) => {
                              if (node) {
                                tileRefs.current.set(s.id, node);
                              } else {
                                tileRefs.current.delete(s.id);
                              }
                            }}
                            id={s.id}
                            alias={s.alias}
                            xp={s.xp}
                            level={s.level}
                            selected={isSelected(s.id)}
                            disabled={!activeQuest}
                            onToggleSelect={toggle}
                            onAward={awardSingle}
                            onFocus={() => setFocusedIdx(idx)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columnCount}, minmax(220px, 1fr))`,
              gap: 14,
              alignItems: 'stretch',
            }}
          >
            {students.map((s, idx) => (
              <div
                key={s.id}
                onFocusCapture={() => setFocusedIdx(idx)}
                className={pulseId === s.id ? 'pulse' : undefined}
                style={{
                  outline: idx === focusedIdx ? '3px solid rgba(0,194,255,0.6)' : 'none',
                  borderRadius: 16,
                  transition: 'outline 0.1s ease-in-out',
                }}
              >
                <StudentTile
                  ref={(node) => {
                    if (node) {
                      tileRefs.current.set(s.id, node);
                    } else {
                      tileRefs.current.delete(s.id);
                    }
                  }}
                  id={s.id}
                  alias={s.alias}
                  xp={s.xp}
                  level={s.level}
                  selected={isSelected(s.id)}
                  disabled={!activeQuest}
                  onToggleSelect={toggle}
                  onAward={awardSingle}
                  onFocus={() => setFocusedIdx(idx)}
                />
              </div>
            ))}
          </div>
        )}
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
              feedback.info('Letzte Aktion rückgängig gemacht');
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
