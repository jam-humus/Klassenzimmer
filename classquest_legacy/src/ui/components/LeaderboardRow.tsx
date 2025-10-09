import React from 'react';

type Props = { rank: number; name: string; xp: number; maxXp: number };

function RowBase({ rank, name, xp, maxXp }: Props) {
  const pct = maxXp ? Math.min(100, Math.round((xp / maxXp) * 100)) : 0;
  return (
    <div
      className="leaderboard-row"
      style={{ display: 'grid', gridTemplateColumns: '48px 1fr 100px', alignItems: 'center', gap: 8, padding: '6px 8px' }}
    >
      <div style={{ opacity: 'var(--leaderboard-rank-opacity, 0.7)' }}>#{rank}</div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>{name}</strong>
          <span style={{ color: 'var(--leaderboard-muted, rgba(15,23,42,0.6))' }}>{xp} XP</span>
        </div>
        <div
          className="leaderboard-row__bar"
          style={{ height: 8, background: 'var(--leaderboard-bar-bg, #eef2f7)', borderRadius: 8, overflow: 'hidden' }}
        >
          <div
            className="leaderboard-row__bar-fill"
            style={{ width: `${pct}%`, height: '100%', background: 'var(--leaderboard-bar-fill, var(--color-primary))' }}
            aria-hidden
          />
        </div>
      </div>
      <div style={{ textAlign: 'right', color: 'var(--leaderboard-muted, rgba(15,23,42,0.6))' }}>{pct}%</div>
    </div>
  );
}

export const LeaderboardRow = React.memo(RowBase);
