import React, { useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { LeaderboardRow } from '~/ui/components/LeaderboardRow';

export default function LeaderboardScreen(){
  const { state } = useApp();
  const [sort, setSort] = useState<'name'|'xp'>('xp');

  const rows = useMemo(()=>{
    const list = state.students.map(s=>({ name: s.alias, xp: s.xp }));
    list.sort((a,b)=> sort==='xp' ? (b.xp-a.xp) : a.name.localeCompare(b.name));
    return list;
  }, [state.students, sort]);

  const maxXp = rows[0]?.xp ?? 0;

  return (
    <div>
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <h2>Leaderboard</h2>
        <div role="group" aria-label="Sortierung">
          <button type="button" onClick={()=>setSort('xp')} aria-pressed={sort==='xp'}>nach XP</button>
          <button type="button" onClick={()=>setSort('name')} aria-pressed={sort==='name'}>nach Name</button>
        </div>
      </div>
      <div style={{ background:'#fff', borderRadius:12, padding:8 }}>
        {rows.map((r, i)=>(
          <LeaderboardRow key={r.name} rank={i+1} name={r.name} xp={r.xp} maxXp={maxXp} />
        ))}
      </div>
    </div>
  );
}
