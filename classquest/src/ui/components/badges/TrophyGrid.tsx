import { useId, useMemo, useState } from 'react';
import { BadgeIcon } from '~/ui/components/BadgeIcon';
import type { Badge } from '~/types/models';

const tileStyle: React.CSSProperties = {
  position: 'relative',
  display: 'grid',
  gridTemplateRows: '1fr auto',
  placeItems: 'center',
  gap: 10,
  width: 120,
  height: 120,
  padding: 14,
  borderRadius: 20,
  border: '1px solid rgba(148,163,184,0.35)',
  background: 'linear-gradient(180deg, rgba(248,250,252,0.92), rgba(226,232,240,0.82))',
  boxShadow: '0 16px 36px rgba(15,23,42,0.12)',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
};

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translate(-50%, -12px)',
  padding: '10px 14px',
  borderRadius: 12,
  background: 'rgba(15,23,42,0.92)',
  color: '#f8fafc',
  minWidth: 200,
  maxWidth: 260,
  boxShadow: '0 12px 32px rgba(15,23,42,0.35)',
  pointerEvents: 'none',
  zIndex: 5,
};

const captionStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#0f172a',
  textAlign: 'center',
  maxWidth: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

type TrophyGridProps = {
  badges: Badge[];
  emptyMessage?: string;
};

function formatAwardedAt(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return value;
  }
  try {
    return new Date(timestamp).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (error) {
    console.warn('Badge-Datum konnte nicht formatiert werden', error);
    return new Date(timestamp).toLocaleString();
  }
}

function TrophyTile({ badge }: { badge: Badge }) {
  const [hover, setHover] = useState(false);
  const tooltipId = useId();
  const description = badge.description?.trim();
  const awardedAt = useMemo(() => formatAwardedAt(badge.awardedAt), [badge.awardedAt]);

  return (
    <li style={{ position: 'relative' }}>
      <button
        type="button"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        aria-describedby={tooltipId}
        aria-label={`Abzeichen: ${badge.name}`}
        style={{
          ...tileStyle,
          transform: hover ? 'translateY(-4px) scale(1.02)' : 'translateY(0)',
          boxShadow: hover ? '0 22px 48px rgba(14,116,144,0.22)' : tileStyle.boxShadow,
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <BadgeIcon name={badge.name} iconKey={badge.iconKey} size={64} />
        </div>
        <span style={captionStyle}>{badge.name}</span>
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        aria-hidden={!hover}
        style={{
          ...tooltipStyle,
          opacity: hover ? 1 : 0,
          visibility: hover ? 'visible' : 'hidden',
        }}
      >
        <strong style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>{badge.name}</strong>
        {description && <p style={{ margin: '0 0 6px', fontSize: 12 }}>{description}</p>}
        <span style={{ fontSize: 12, opacity: 0.9 }}>Vergeben am {awardedAt}</span>
      </div>
    </li>
  );
}

export function TrophyGrid({ badges, emptyMessage = 'Noch keine Abzeichen – starte mit einer Quest!' }: TrophyGridProps) {
  const sortedBadges = useMemo(() => {
    const copy = [...badges];
    copy.sort((a, b) => {
      const timeA = Date.parse(a.awardedAt);
      const timeB = Date.parse(b.awardedAt);
      if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
      if (Number.isNaN(timeA)) return 1;
      if (Number.isNaN(timeB)) return -1;
      return timeB - timeA;
    });
    return copy;
  }, [badges]);

  if (sortedBadges.length === 0) {
    return <p style={{ margin: 0, color: '#475569' }}>{emptyMessage}</p>;
  }

  return (
    <ul
      role="list"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      }}
    >
      {sortedBadges.map((badge) => (
        <TrophyTile key={`${badge.id}-${badge.awardedAt}`} badge={badge} />
      ))}
    </ul>
  );
}

export default TrophyGrid;
