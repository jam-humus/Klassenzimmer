import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Student } from '~/types/models';
import { AvatarView } from '~/ui/avatar/AvatarView';
import { BadgeIcon } from '~/ui/components/BadgeIcon';

type Props = {
  id: string;
  alias: string;
  xp: number;
  level: number;
  badges?: Student['badges'];
  avatarMode?: Student['avatarMode'];
  avatarPack?: Student['avatarPack'];
  selected: boolean;
  disabled?: boolean;
  onToggleSelect: (id: string) => void;
  onAward: (id: string) => void;
  onFocus?: () => void;
  onLevelUp?: (info: { id: string; alias: string; level: number }) => void;
};

const TileInner = React.forwardRef<HTMLDivElement, Props>(function TileBase(
  {
    id,
    alias,
    xp,
    level,
    badges,
    avatarMode,
    avatarPack,
    selected,
    disabled,
    onToggleSelect,
    onAward,
    onFocus,
    onLevelUp,
  },
  ref,
) {
  const [evolved, setEvolved] = useState(false);
  const previousLevelRef = useRef(level);
  const resetTimeoutRef = useRef<number | null>(null);
  const recentBadges = useMemo(() => {
    if (!badges || badges.length === 0) {
      return [] as Student['badges'];
    }
    const sorted = [...badges].sort((a, b) => {
      const timeA = Date.parse(a.awardedAt);
      const timeB = Date.parse(b.awardedAt);
      if (Number.isNaN(timeA) && Number.isNaN(timeB)) {
        return 0;
      }
      if (Number.isNaN(timeA)) {
        return 1;
      }
      if (Number.isNaN(timeB)) {
        return -1;
      }
      return timeB - timeA;
    });
    return sorted.slice(0, 2);
  }, [badges]);

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
        border: selected
          ? '1px solid rgba(96,165,250,0.9)'
          : '1px solid rgba(148,163,184,0.18)',
        borderRadius: 18,
        padding: 16,
        background: selected
          ? 'linear-gradient(150deg, rgba(59,130,246,0.18), rgba(99,102,241,0.22))'
          : 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(15,23,42,0.86))',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 150,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        boxShadow: selected
          ? '0 16px 40px rgba(56,189,248,0.25)'
          : '0 12px 30px rgba(2,6,23,0.45)',
        transition: 'box-shadow 0.15s ease, border 0.15s ease, transform 0.15s ease',
        transform: evolved ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0,
            flex: '1 1 auto',
          }}
        >
          <AvatarView
            student={{ alias, avatarMode, avatarPack, level, xp }}
            size={56}
            rounded="xl"
          />
          <strong
            style={{
              fontSize: '1.05rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#f8fafc',
            }}
            title={alias}
          >
            {alias}
          </strong>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          {recentBadges.map((badge) => (
            <BadgeIcon
              key={`${badge.id}-${badge.awardedAt}`}
              name={badge.name}
              iconKey={badge.iconKey}
              size={36}
            />
          ))}
          <span
            style={{
              fontSize: 12,
              opacity: 0.85,
              flexShrink: 0,
              padding: '6px 10px',
              borderRadius: 12,
              background: 'rgba(148,163,184,0.14)',
              border: '1px solid rgba(148,163,184,0.25)',
            }}
          >
            {xp} XP · L{level}
          </span>
        </div>
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
            padding: '7px 14px',
            borderRadius: 999,
            border: '1px solid rgba(99,102,241,0.65)',
            background: selected
              ? 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(56,189,248,0.25))'
              : 'rgba(255,255,255,0.06)',
            color: '#e2e8f0',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: selected ? '0 10px 30px rgba(56,189,248,0.25)' : 'none',
          }}
        >
          {selected ? 'Ausgewählt' : 'Auswählen'}
        </button>
        {disabled ? (
          <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.75)' }}>Quest wählen</span>
        ) : (
          <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.75)' }}>S = Auswahl</span>
        )}
      </div>
    </div>
  );
});

TileInner.displayName = 'StudentTile';

export const StudentTile = React.memo(TileInner);
