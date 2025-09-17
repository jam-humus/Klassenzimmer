import React from 'react';
type Props = { time:string; studentAlias:string; questName:string; xp:number };
function ItemBase({ time, studentAlias, questName, xp }: Props){
  return (
    <li style={{ padding:'6px 0' }}>
      <span style={{ opacity:.7, marginRight:8 }}>{time}</span>
      <strong>{questName}</strong> → {studentAlias} (+{xp} XP)
    </li>
  );
}
export const LogItem = React.memo(ItemBase);
