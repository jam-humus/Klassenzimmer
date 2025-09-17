import React from 'react';
type Props = { rank:number; name:string; xp:number; maxXp:number };
function RowBase({ rank, name, xp, maxXp }: Props){
  const pct = maxXp ? Math.min(100, Math.round((xp / maxXp) * 100)) : 0;
  return (
    <div style={{ display:'grid', gridTemplateColumns:'48px 1fr 100px', alignItems:'center', gap:8, padding:'6px 8px' }}>
      <div style={{ opacity:.7 }}>#{rank}</div>
      <div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <strong>{name}</strong><span style={{ opacity:.7 }}>{xp} XP</span>
        </div>
        <div style={{ height:8, background:'#eef2f7', borderRadius:8, overflow:'hidden' }}>
          <div style={{ width:`${pct}%`, height:'100%', background:'var(--color-primary)' }} aria-hidden />
        </div>
      </div>
      <div style={{ textAlign:'right' }}>{pct}%</div>
    </div>
  );
}
export const LeaderboardRow = React.memo(RowBase);
