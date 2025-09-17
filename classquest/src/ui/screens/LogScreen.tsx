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

  const entries = useMemo(()=>{
    return state.logs
      .filter(l => (!studentFilter || l.studentId===studentFilter)
        && (!questFilter || l.questId===questFilter)
        && (l.timestamp>=tsMin))
      .slice(0, 500); // cap render work
  }, [state.logs, studentFilter, questFilter, tsMin]);

  return (
    <div>
      <h2>Protokoll</h2>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        <select aria-label="Filter Schüler" value={studentFilter} onChange={e=>setStudentFilter(e.target.value)}>
          <option value=''>Alle Schüler</option>
          {state.students.map(s=><option key={s.id} value={s.id}>{s.alias}</option>)}
        </select>
        <select aria-label="Filter Quest" value={questFilter} onChange={e=>setQuestFilter(e.target.value)}>
          <option value=''>Alle Quests</option>
          {state.quests.map(q=><option key={q.id} value={q.id}>{q.name}</option>)}
        </select>
        <select aria-label="Zeitraum" value={period} onChange={e=>setPeriod(e.target.value as any)}>
          <option value='today'>Heute</option>
          <option value='week'>Diese Woche</option>
          <option value='all'>Gesamt</option>
        </select>
      </div>
      <ol style={{ background:'#fff', borderRadius:12, padding:'8px 12px', maxHeight: '60vh', overflow:'auto' }}>
        {entries.map(l=>(
          <LogItem key={l.id}
            time={new Date(l.timestamp).toLocaleTimeString()}
            studentAlias={studentsById[l.studentId] ?? l.studentId}
            questName={l.questName} xp={l.xp}
          />
        ))}
      </ol>
    </div>
  );
}
