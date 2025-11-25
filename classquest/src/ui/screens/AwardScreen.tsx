import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { StudentTile } from '~/ui/components/StudentTile';
import AwardBadgeButton from '~/ui/components/AwardBadgeButton';
import { ClassProgressBar } from '~/ui/components/ClassProgressBar';
import { useSelection } from '~/ui/hooks/useSelection';
import { useUndoToast } from '~/ui/hooks/useUndoToast';
import { EVENT_CLEAR_SELECTION, EVENT_SELECT_ALL, EVENT_FOCUS_STUDENT, EVENT_SET_ACTIVE_QUEST, EVENT_TOGGLE_GROUP_FILTER, EVENT_UNDO_PERFORMED } from '~/ui/shortcut/events';
import { useFeedback } from '~/ui/feedback/FeedbackProvider';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Quest, Team } from '~/types/models';
import { playXpAwardedEffectsCoalesced } from '~/utils/effects';
import { playLottieOverlay } from '~/ui/anim/playLottie';

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
        borderRadius: 12,
        border: '1px solid rgba(148,163,184,0.3)',
        background:
          disabled || membersCount === 0
            ? 'rgba(255,255,255,0.05)'
            : 'linear-gradient(135deg, rgba(148,163,184,0.18), rgba(59,130,246,0.18))',
        fontWeight: 700,
        color: '#e2e8f0',
        cursor: disabled || membersCount === 0 ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
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
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const pendingFocusRef = useRef<string | null>(null);
  const [columns, setColumns] = useState(3);
  const [scrolled, setScrolled] = useState(false);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const pulseTimeoutRef = useRef<number | null>(null);
  const overlayCleanupRef = useRef<(() => void) | null>(null);
  const { message, setMessage, clear: clearToast } = useUndoToast();

  const allStudents = state.students;
  const students = useMemo(() => {
    if (!groupFilter) return allStudents;
    const team = state.teams.find((t) => t.id === groupFilter);
    if (!team) return allStudents;
    const allowed = new Set(team.memberIds);
    return allStudents.filter((student) => allowed.has(student.id));
  }, [allStudents, groupFilter, state.teams]);
  const focusedStudent = students[focusedIdx];
  const studentIdSet = useMemo(() => new Set(allStudents.map((student) => student.id)), [allStudents]);
  const aliasById = useMemo(() => new Map(allStudents.map((s) => [s.id, s.alias])), [allStudents]);
  const orderedSelectedIds = useMemo(
    () => allStudents.filter((student) => selected.has(student.id)).map((student) => student.id),
    [allStudents, selected],
  );
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
    if (!pendingFocusRef.current) return;
    const targetId = pendingFocusRef.current;
    const index = students.findIndex((student) => student.id === targetId);
    if (index >= 0) {
      setFocusedIdx(index);
      pendingFocusRef.current = null;
    }
  }, [students, setFocusedIdx]);

  useEffect(() => {
    if (groupFilter != null) {
      setFocusedIdx((prev) => (students.length ? Math.min(prev, students.length - 1) : 0));
    }
  }, [groupFilter, students.length]);

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
    if (overlayCleanupRef.current) {
      overlayCleanupRef.current();
      overlayCleanupRef.current = null;
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

  const animationsAllowed = state.settings.animationsEnabled !== false;
  const kidModeEnabled = Boolean(state.settings.kidModeEnabled);

  const handleLevelUp = useCallback(() => {
      if (!kidModeEnabled || !animationsAllowed) {
        return;
      }
      if (typeof document === 'undefined') {
        return;
      }
      if (overlayCleanupRef.current) {
        overlayCleanupRef.current();
      }
      overlayCleanupRef.current = playLottieOverlay('/anim/rocket-burst.json', {
        scale: 1,
        durationMs: 1400,
      });
    },
    [animationsAllowed, kidModeEnabled],
  );

  const awardStudent = useCallback(
    (studentId: string, quest: Quest) => {
      dispatch({ type: 'AWARD', payload: { questId: quest.id, studentId } });
      playXpAwardedEffectsCoalesced();
      return true;
    },
    [dispatch],
  );

  const awardSelected = useCallback(() => {
    if (!activeQuest) return;
    if (!orderedSelectedIds.length) return;
    const granted: string[] = [];
    orderedSelectedIds.forEach((id) => {
      if (awardStudent(id, activeQuest)) {
        granted.push(id);
      }
    });
    if (!granted.length) {
      return;
    }
    const target = granted.length === 1 ? aliasById.get(granted[0]) ?? 'Schüler' : `${granted.length} Schüler`;
    showUndoToast(activeQuest, target);
    feedback.success('Aktive Quest an Auswahl vergeben');
  }, [activeQuest, orderedSelectedIds, awardStudent, aliasById, showUndoToast, feedback]);

  const awardSingle = useCallback(
    (studentId: string) => {
      if (!activeQuest) return;
      const granted = awardStudent(studentId, activeQuest);
      if (!granted) {
        return;
      }
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

  const activeGroup = useMemo(() => {
    if (!groupFilter) return null;
    return state.teams.find((team) => team.id === groupFilter) ?? null;
  }, [state.teams, groupFilter]);

  const awardGroup = useCallback(
    (teamId: string) => {
      if (!activeQuest) return;
      const team = groups.find((t) => t.id === teamId);
      if (!team) return;
      if (activeQuest.target === 'team') {
        if (team.memberIds.length === 0) {
          return;
        }
        dispatch({ type: 'AWARD', payload: { questId: activeQuest.id, teamId: team.id } });
        playXpAwardedEffectsCoalesced();
        showUndoToast(activeQuest, team.name);
        feedback.success(`${activeQuest.name} an ${team.name}`);
        return;
      }
      const members = team.memberIds;
      if (!members.length) return;
      const granted: string[] = [];
      members.forEach((memberId) => {
        if (awardStudent(memberId, activeQuest)) {
          granted.push(memberId);
        }
      });
      if (!granted.length) {
        return;
      }
      const label = granted.length > 1 ? `${team.name} (${granted.length})` : team.name;
      showUndoToast(activeQuest, label);
      feedback.success(`${activeQuest.name} an ${label}`);
    },
    [activeQuest, groups, dispatch, awardStudent, showUndoToast, feedback],
  );

  useEffect(() => {
    const handleSelectAll = () => {
      if (!students.length) return;
      setMany(students.map((student) => student.id));
    };
    const handleClearSelection = () => {
      clear();
    };
    const handleFocusStudent = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      pendingFocusRef.current = id;
      setGroupFilter((current) => {
        if (!current) return current;
        const team = state.teams.find((t) => t.id === current);
        if (team && team.memberIds.includes(id)) {
          return current;
        }
        return null;
      });
    };
    const handleToggleGroup = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      setGroupFilter((current) => (current === id ? null : id));
    };
    const handleSetActiveQuest = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      setActiveQuestId(id);
    };
    const handleUndoPerformed = () => {
      clearToast();
    };
    window.addEventListener(EVENT_SELECT_ALL, handleSelectAll as EventListener);
    window.addEventListener(EVENT_CLEAR_SELECTION, handleClearSelection as EventListener);
    window.addEventListener(EVENT_FOCUS_STUDENT, handleFocusStudent as EventListener);
    window.addEventListener(EVENT_TOGGLE_GROUP_FILTER, handleToggleGroup as EventListener);
    window.addEventListener(EVENT_SET_ACTIVE_QUEST, handleSetActiveQuest as EventListener);
    window.addEventListener(EVENT_UNDO_PERFORMED, handleUndoPerformed as EventListener);
    return () => {
      window.removeEventListener(EVENT_SELECT_ALL, handleSelectAll as EventListener);
      window.removeEventListener(EVENT_CLEAR_SELECTION, handleClearSelection as EventListener);
      window.removeEventListener(EVENT_FOCUS_STUDENT, handleFocusStudent as EventListener);
      window.removeEventListener(EVENT_TOGGLE_GROUP_FILTER, handleToggleGroup as EventListener);
      window.removeEventListener(EVENT_SET_ACTIVE_QUEST, handleSetActiveQuest as EventListener);
      window.removeEventListener(EVENT_UNDO_PERFORMED, handleUndoPerformed as EventListener);
    };
  }, [students, setMany, clear, state.teams, clearToast, setGroupFilter, setActiveQuestId]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.defaultPrevented) return;
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
      }
    },
    [students, columnCount, activeQuest, awardSingle, focusedIdx, setFocus],
  );

  const selectAll = useCallback(() => setMany(students.map((s) => s.id)), [students, setMany]);

  const selectedCount = orderedSelectedIds.length;

  return (
    <div
      ref={containerRef}
      onKeyDown={onKeyDown}
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '0 0 28px',
        background:
          'radial-gradient(circle at 20% 20%, rgba(59,130,246,0.08), transparent 30%), radial-gradient(circle at 80% 10%, rgba(56,189,248,0.08), transparent 28%), #070d1c',
        color: '#e2e8f0',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          background: 'linear-gradient(180deg, rgba(8,15,30,0.96), rgba(8,15,30,0.9))',
          padding: '14px 0 16px',
          zIndex: 1,
          boxShadow: scrolled ? '0 10px 28px rgba(0,0,0,0.45)' : '0 1px 0 rgba(148,163,184,0.08)',
          borderBottom: '1px solid rgba(148,163,184,0.16)',
        }}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <ClassProgressBar />
          <div
            role="radiogroup"
            aria-label="Aktive Quest"
            style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}
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
                      borderRadius: 14,
                      border: isActive ? '1px solid rgba(96,165,250,0.8)' : '1px solid rgba(148,163,184,0.25)',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(56,189,248,0.18))'
                        : 'rgba(255,255,255,0.06)',
                      fontWeight: 700,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 12px 30px rgba(56,189,248,0.22)' : 'none',
                    }}
                  >
                    +{q.xp} {q.name}
                  </button>
                );
              })
            ) : (
              <em style={{ color: 'rgba(226,232,240,0.75)' }}>Keine aktiven Quests</em>
            )}
          </div>
          {groups.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(226,232,240,0.85)' }}>Gruppen:</span>
              {groups.map((team) => (
                <GroupChip
                  key={team.id}
                  team={team}
                  membersCount={team.memberIds.length}
                  disabled={!activeQuest || team.memberIds.length === 0}
                  onAward={awardGroup}
                />
              ))}
            </div>
          )}
          {activeGroup && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: 'rgba(59,130,246,0.12)',
                padding: '8px 12px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.3)',
                width: 'fit-content',
              }}
            >
              <span>Gefiltert nach Gruppe: <strong>{activeGroup?.name}</strong></span>
              <button
                type="button"
                onClick={() => setGroupFilter(null)}
                style={{
                  fontSize: 12,
                  color: '#e2e8f0',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Filter entfernen
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={awardSelected}
              disabled={!activeQuest || selectedCount === 0}
              aria-disabled={!activeQuest || selectedCount === 0}
              style={{
                padding: '12px 18px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
                color: '#0b1224',
                fontWeight: 800,
                border: 'none',
                minWidth: 220,
                cursor: !activeQuest || selectedCount === 0 ? 'not-allowed' : 'pointer',
                opacity: !activeQuest || selectedCount === 0 ? 0.5 : 1,
                boxShadow: '0 18px 36px rgba(56,189,248,0.35)',
              }}
            >
              Allen ausgewählten vergeben
            </button>
            <span aria-live="polite" style={{ fontWeight: 700, color: 'rgba(226,232,240,0.85)' }}>
              Ausgewählt: {selectedCount}
            </span>
            <button
              type="button"
              onClick={selectAll}
              aria-label="Alle Schüler auswählen"
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.3)',
                background: 'rgba(255,255,255,0.06)',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#e2e8f0',
              }}
            >
              Alle auswählen
            </button>
            <button
              type="button"
              onClick={clear}
              aria-label="Auswahl leeren"
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.3)',
                background: 'rgba(255,255,255,0.06)',
                cursor: 'pointer',
                fontWeight: 700,
                color: '#e2e8f0',
              }}
            >
              Auswahl leeren
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'UNDO_LAST' });
                clearToast();
                feedback.info('Letzte Aktion rückgängig gemacht');
                window.dispatchEvent(new Event(EVENT_UNDO_PERFORMED));
              }}
              aria-label="Letzte Vergabe rückgängig machen"
              style={{
                padding: '8px 14px',
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.35)',
                background: 'rgba(255,255,255,0.08)',
                color: '#e2e8f0',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Undo
            </button>
          </div>
          {focusedStudent && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(226,232,240,0.85)' }}>
                Aktionen für: <span style={{ color: '#38bdf8' }}>{focusedStudent.alias}</span>
              </span>
              <AwardBadgeButton student={focusedStudent} />
            </div>
          )}
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
                            badges={s.badges}
                            avatarMode={s.avatarMode}
                            avatarPack={s.avatarPack}
                            selected={isSelected(s.id)}
                            disabled={!activeQuest}
                            onToggleSelect={toggle}
                            onAward={awardSingle}
                            onFocus={() => setFocusedIdx(idx)}
                            onLevelUp={handleLevelUp}
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
                  badges={s.badges}
                  avatarMode={s.avatarMode}
                  avatarPack={s.avatarPack}
                  selected={isSelected(s.id)}
                  disabled={!activeQuest}
                  onToggleSelect={toggle}
                  onAward={awardSingle}
                  onFocus={() => setFocusedIdx(idx)}
                  onLevelUp={handleLevelUp}
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
              window.dispatchEvent(new Event(EVENT_UNDO_PERFORMED));
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
