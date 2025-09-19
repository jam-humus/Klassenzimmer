import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useApp } from '~/app/AppContext';
import { LogItem } from '~/ui/components/LogItem';
import { useVirtualizer } from '@tanstack/react-virtual';

function startOfDay(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function startOfWeek(date = new Date()) {
  const start = startOfDay(date);
  const diff = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - diff);
  return start;
}

export default function LogScreen() {
  const { state } = useApp();
  const [studentFilter, setStudentFilter] = useState<string>('');
  const [questFilter, setQuestFilter] = useState<string>('');
  const [period, setPeriod] = useState<'today' | 'week' | 'all'>('all');

  const virtualize = Boolean(state.settings.flags?.virtualize);
  const studentsById = useMemo(
    () => Object.fromEntries(state.students.map((student) => [student.id, student.alias])),
    [state.students],
  );
  const tsMin =
    period === 'today' ? startOfDay().getTime() : period === 'week' ? startOfWeek().getTime() : 0;

  const entries = useMemo(() => {
    return state.logs
      .filter(
        (log) =>
          (!studentFilter || log.studentId === studentFilter) &&
          (!questFilter || log.questId === questFilter) &&
          log.timestamp >= tsMin,
      )
      .slice(0, virtualize ? 10_000 : 500);
  }, [state.logs, studentFilter, questFilter, tsMin, virtualize]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 8,
    enabled: virtualize,
  });

  const listStyles: CSSProperties = { margin: 0, padding: 0, listStyle: 'none' };

  return (
    <div>
      <h2>Protokoll</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          aria-label="Filter Schüler"
          value={studentFilter}
          onChange={(event) => setStudentFilter(event.target.value)}
        >
          <option value="">Alle Schüler</option>
          {state.students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.alias}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter Quest"
          value={questFilter}
          onChange={(event) => setQuestFilter(event.target.value)}
        >
          <option value="">Alle Quests</option>
          {state.quests.map((quest) => (
            <option key={quest.id} value={quest.id}>
              {quest.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Zeitraum"
          value={period}
          onChange={(event) => setPeriod(event.target.value as 'today' | 'week' | 'all')}
        >
          <option value="today">Heute</option>
          <option value="week">Diese Woche</option>
          <option value="all">Gesamt</option>
        </select>
        <span aria-live="polite" style={{ fontWeight: 600 }}>
          <span className="sr-only">Anzahl Einträge:</span>
          {entries.length}
        </span>
      </div>
      <div
        ref={virtualize ? parentRef : undefined}
        style={{ background: '#fff', borderRadius: 12, padding: '8px 12px', maxHeight: '60vh', overflow: 'auto' }}
      >
        {virtualize ? (
          entries.length === 0 ? (
            <ol style={listStyles}>
              <li>Keine Einträge vorhanden.</li>
            </ol>
          ) : (
            <ol
              style={{
                ...listStyles,
                position: 'relative',
                height: rowVirtualizer.getTotalSize(),
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const log = entries[virtualRow.index];
                return (
                  <LogItem
                    key={log.id}
                    time={new Date(log.timestamp).toLocaleTimeString()}
                    studentAlias={studentsById[log.studentId] ?? log.studentId}
                    questName={log.questName}
                    xp={log.xp}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  />
                );
              })}
            </ol>
          )
        ) : (
          <ol style={listStyles}>
            {entries.length === 0 && <li>Keine Einträge vorhanden.</li>}
            {entries.map((log) => (
              <LogItem
                key={log.id}
                time={new Date(log.timestamp).toLocaleTimeString()}
                studentAlias={studentsById[log.studentId] ?? log.studentId}
                questName={log.questName}
                xp={log.xp}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}