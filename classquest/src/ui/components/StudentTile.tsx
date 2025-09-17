import React from 'react';

type Props = {
  id: string;
  alias: string;
  xp: number;
  level: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onFocus?: () => void;
  children?: React.ReactNode;
};

const TileInner = React.forwardRef<HTMLDivElement, Props>(function TileBase(
  { id, alias, xp, level, selected, onSelect, onFocus, children },
  ref,
) {
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onSelect(id);
        }
      }}
      onFocus={onFocus}
      aria-pressed={selected}
      aria-label={`Schüler ${alias}, ${xp} XP, Level ${level}${selected ? ', ausgewählt' : ''}`}
      style={{
        border: selected ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 14,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 140,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong style={{ fontSize: '1.1rem' }}>{alias}</strong>
        <span style={{ fontSize: 12, opacity: 0.8 }}>{xp} XP · L{level}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </div>
  );
});

TileInner.displayName = 'StudentTile';

export const StudentTile = React.memo(TileInner);
