import React from 'react';
import { useApp } from '~/app/AppContext';
import { resolveAvatarStageIndex, sanitizeAvatarStageThresholds } from '~/core/avatarStages';
import { levelFromXP } from '~/core/xp';
import { addSnapshot, listSnapshots, type WeeklySnapshot } from '~/services/weeklyStorage';

function getWeekLabel(date: Date): string {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() === 0 ? 7 : utcDate.getUTCDay();
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `KW ${week} (${date.toISOString().slice(0, 10)})`;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('de-DE');
}

export default function ManageSnapshots() {
  const { state } = useApp();
  const [snapshots, setSnapshots] = React.useState<WeeklySnapshot[]>(() => listSnapshots());

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }
    const handleStorage = () => setSnapshots(listSnapshots());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const createSnapshot = React.useCallback(() => {
    const now = new Date();
    const xpPerLevel = state.settings?.xpPerLevel ?? 100;
    const thresholds = sanitizeAvatarStageThresholds(state.settings?.avatarStageThresholds);
    const snapshot: WeeklySnapshot = {
      id: now.toISOString(),
      label: getWeekLabel(now),
      createdAt: now.toISOString(),
      students: (state.students ?? []).map((student) => {
        const xp = Math.max(0, student.xp ?? 0);
        const level = Math.max(1, student.level ?? levelFromXP(xp, xpPerLevel));
        const stage = resolveAvatarStageIndex(level, thresholds);
        return {
          id: student.id,
          alias: student.alias,
          xp,
          level,
          stage,
          badgeIds: (student.badges ?? []).map((badge) => badge.id),
        };
      }),
    };
    addSnapshot(snapshot);
    setSnapshots(listSnapshots());
  }, [state]);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        border: '1px solid #cbd5f5',
        background: '#f8fafc',
        display: 'grid',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={createSnapshot}
          style={{
            padding: '10px 16px',
            borderRadius: 999,
            border: '1px solid #94a3b8',
            background: '#0f172a',
            color: '#f8fafc',
            fontWeight: 600,
          }}
        >
          Snapshot speichern
        </button>
        <a
          href="/show"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '10px 16px',
            borderRadius: 999,
            border: '1px solid #94a3b8',
            background: '#e2e8f0',
            color: '#0f172a',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Weekly-Show öffnen
        </a>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>
        Snapshots werden im Browser gespeichert und dienen als Basis für die Weekly-Show.
      </p>
      {snapshots.length === 0 ? (
        <p style={{ margin: 0, fontStyle: 'italic', color: '#64748b' }}>Noch keine Snapshots vorhanden.</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
          {snapshots.map((snapshot) => (
            <li
              key={snapshot.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 12,
                background: '#fff',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ fontWeight: 600 }}>{snapshot.label}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{formatTimestamp(snapshot.createdAt)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
