import React from 'react';

type Props = {
  time: string;
  studentAlias: string;
  questName: string;
  xp: number;
  style?: React.CSSProperties;
};

function ItemBase({ time, studentAlias, questName, xp, style }: Props) {
  const baseStyle: React.CSSProperties = { padding: '6px 0' };
  const mergedStyle = style ? { ...baseStyle, ...style } : baseStyle;
  return (
    <li style={mergedStyle}>
      <span style={{ opacity:.7, marginRight:8 }}>{time}</span>
      <strong>{questName}</strong> → {studentAlias} (+{xp} XP)
    </li>
  );
}
export const LogItem = React.memo(ItemBase);
