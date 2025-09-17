import React, { useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { LogItem } from '~/ui/components/LogItem';

function startOfDay(d=new Date()){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
function startOfWeek(d=new Date()){ const x=startOfDay(d); const diff=(x.getDay()+6)%7; x.setDate(x.getDate()-diff); return x; }

export default function LogScreen(){
  const { state } = useApp();
  const [studentFilter, setStudentFilter] = useState<string>('');
  const [questFilter, setQuestFilter] = useState<string>('');
  const [period, setPeriod] = useState<'today'|'week'|'all'>('all');

  const studentsById = useMemo(()=>Object.fromEntries(state.students.map(s=>[s.id,s.alias])), [state.students]);
  const tsMin = period==='today' ? startOfDay().getTime() : period==='week' ? startOfWeek().getTime() : 0;

  const orderedLogs = useMemo(() => [...state.logs].sort((a, b) => b.timestamp - a.timestamp), [state.logs]);
  const entries = useMemo(() => {
    return orderedLogs
      .filter((log) => (!studentFilter || log.studentId === studentFilter)
        && (!questFilter || log.questId === questFilter)
        && log.timestamp >= tsMin)
      .slice(0, 500);
  }, [orderedLogs, studentFilter, questFilter, tsMin]);

  return (
    <div>
      <h2>Protokoll</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select aria-label="Filter Schüler" value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)}>
          <option value=''>Alle Schüler</option>
          {state.students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.alias}
            </option>
          ))}
        </select>
        <select aria-label="Filter Quest" value={questFilter} onChange={(event) => setQuestFilter(event.target.value)}>
          <option value=''>Alle Quests</option>
          {state.quests.map((quest) => (
            <option key={quest.id} value={quest.id}>
              {quest.name}
            </option>
          ))}
        </select>
        <select aria-label="Zeitraum" value={period} onChange={(event) => setPeriod(event.target.value as any)}>
          <option value='today'>Heute</option>
          <option value='week'>Diese Woche</option>
          <option value='all'>Gesamt</option>
        </select>
        <span aria-live="polite" style={{ fontWeight: 600 }}><span className='sr-only'>Anzahl Einträge:</span>{entries.length}</span>
      </div>
      <ol style={{ background: '#fff', borderRadius: 12, padding: '8px 12px', maxHeight: '60vh', overflow: 'auto' }}>
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
    </div>
  );
}
