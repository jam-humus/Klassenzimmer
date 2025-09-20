import React, { useEffect, useRef, useState } from 'react';

type Props = {
  id: string;
  alias: string;
  xp: number;
  level: number;
  selected: boolean;
  disabled?: boolean;
  onToggleSelect: (id: string) => void;
  onAward: (id: string) => void;
  onFocus?: () => void;
  onLevelUp?: (info: { id: string; alias: string; level: number }) => void;
};

const TileInner = React.forwardRef<HTMLDivElement, Props>(function TileBase(
  { id, alias, xp, level, selected, disabled, onToggleSelect, onAward, onFocus, onLevelUp },
  ref,
) {
  const [evolved, setEvolved] = useState(false);
  const previousLevelRef = useRef(level);
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const previousLevel = previousLevelRef.current;
    if (level > previousLevel) {
      setEvolved(true);
      onLevelUp?.({ id, alias, level });
      if (typeof window !== 'undefined') {
        if (resetTimeoutRef.current != null) {
          window.clearTimeout(resetTimeoutRef.current);
        }
        resetTimeoutRef.current = window.setTimeout(() => {
          setEvolved(false);
          resetTimeoutRef.current = null;
        }, 900);
      }
    }
    previousLevelRef.current = level;
    return () => {
      if (resetTimeoutRef.current != null) {
        window.clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    };
  }, [alias, id, level, onLevelUp]);

  return (
    <div
      ref={ref}
      role="button"
      className={`tile${evolved ? ' tile-evolved' : ''}`}
      tabIndex={0}
      onClick={() => {
        if (!disabled) {
          onAward(id);
        }
      }}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
          event.preventDefault();
          onAward(id);
          return;
        }
        if (event.key.toLowerCase() === 's') {
          event.preventDefault();
          onToggleSelect(id);
        }
      }}
      onFocus={onFocus}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      aria-label={`Schüler ${alias}, ${xp} XP, Level ${level}${selected ? ', ausgewählt' : ''}${disabled ? '. Quest wählen' : ''}`}
      style={{
        border: selected ? '2px solid var(--color-primary)' : '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 16,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 150,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        boxShadow: selected ? '0 0 0 4px rgba(91,141,239,0.15)' : 'none',
        transition: 'box-shadow 0.15s ease, border 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <strong style={{ fontSize: '1.1rem' }}>{alias}</strong>
        <span style={{ fontSize: 12, opacity: 0.75 }}>{xp} XP · L{level}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect(id);
          }}
          onKeyDown={(event) => {
            if (event.key === ' ') {
              event.preventDefault();
            }
          }}
          aria-pressed={selected}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid #cbd5f5',
            background: selected ? 'rgba(91,141,239,0.15)' : '#f8fbff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {selected ? 'Ausgewählt' : 'Auswählen'}
        </button>
        {disabled ? <span style={{ fontSize: 12, color: '#64748b' }}>Quest wählen</span> : <span style={{ fontSize: 12, color: '#64748b' }}>S = Auswahl</span>}
      </div>
    </div>
  );
});

TileInner.displayName = 'StudentTile';

export const StudentTile = React.memo(TileInner);
