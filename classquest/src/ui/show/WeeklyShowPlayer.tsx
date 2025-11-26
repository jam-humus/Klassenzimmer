import React from 'react';
import { useApp } from '~/app/AppContext';
import WeeklyShowSlide from '~/ui/show/WeeklyShowSlide';
import { computeDeltasFromSnapshot, computeWeeklyDeltas, type WeeklyDelta } from '~/core/show/weekly';
import { listSnapshots, type WeeklySnapshot } from '~/services/weeklyStorage';
import { useSlideshowSounds } from '~/slideshow/hooks/useSlideshowSounds';

function formatDateLabel(snapshot: WeeklySnapshot): string {
  const created = new Date(snapshot.createdAt);
  return `${snapshot.label} – ${created.toLocaleString('de-DE')}`;
}

function shuffle(values: WeeklyDelta[]): WeeklyDelta[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const tmp = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = tmp;
  }
  return copy;
}

type Order = 'alpha' | 'delta' | 'random';

const BACKGROUND_STYLE: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(135deg, #0f172a 0%, #312e81 60%, #0f172a 100%)',
  color: '#e2e8f0',
};

export default function WeeklyShowPlayer() {
  const { state } = useApp();
  useSlideshowSounds();
  const [order, setOrder] = React.useState<Order>('delta');
  const [onlyChanged, setOnlyChanged] = React.useState(true);
  const [autoPlay, setAutoPlay] = React.useState(true);
  const [durationSeconds, setDurationSeconds] = React.useState(12);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [fromInput, setFromInput] = React.useState('');
  const [fromISO, setFromISO] = React.useState<string | undefined>(undefined);
  const [useSnapshot, setUseSnapshot] = React.useState(true);
  const [snapshots, setSnapshots] = React.useState<WeeklySnapshot[]>(() => listSnapshots());
  const [snapshotId, setSnapshotId] = React.useState<string | undefined>(() => listSnapshots()[0]?.id);
  const showcaseSignatureRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const handleStorage = () => {
      setSnapshots(listSnapshots());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }
    return () => undefined;
  }, []);

  React.useEffect(() => {
    if (snapshots.length === 0 && useSnapshot) {
      setUseSnapshot(false);
    }
  }, [snapshots.length, useSnapshot]);

  React.useEffect(() => {
    if (snapshotId && snapshots.some((entry) => entry.id === snapshotId)) {
      return;
    }
    setSnapshotId(snapshots[0]?.id);
  }, [snapshotId, snapshots]);

  const deltas = React.useMemo(() => {
    let result: WeeklyDelta[] = [];
    if (useSnapshot) {
      const snapshot = snapshots.find((entry) => entry.id === snapshotId);
      if (snapshot) {
        result = computeDeltasFromSnapshot(state, snapshot);
      } else {
        result = computeWeeklyDeltas(state, fromISO);
      }
    } else {
      result = computeWeeklyDeltas(state, fromISO);
    }

    if (onlyChanged) {
      result = result.filter((delta) => {
        const xpGain = delta.xpEnd - delta.xpStart;
        const levelGain = delta.levelEnd - delta.levelStart;
        return xpGain > 0 || levelGain > 0 || delta.newBadges.length > 0;
      });
    }

    switch (order) {
      case 'alpha':
        result = [...result].sort((a, b) => a.alias.localeCompare(b.alias, 'de'));
        break;
      case 'delta':
        result = [...result].sort((a, b) => {
          const gainA = a.xpEnd - a.xpStart;
          const gainB = b.xpEnd - b.xpStart;
          return gainB - gainA;
        });
        break;
      case 'random':
        result = shuffle(result);
        break;
      default:
        break;
    }
    return result;
  }, [state, fromISO, order, onlyChanged, useSnapshot, snapshotId, snapshots]);

  React.useEffect(() => {
    if (!deltas.length) {
      showcaseSignatureRef.current = null;
      return;
    }
    const signature = deltas.map((delta) => delta.studentId).join('|');
    if (showcaseSignatureRef.current === signature) {
      return;
    }
    showcaseSignatureRef.current = signature;
  }, [deltas]);

  React.useEffect(() => {
    setCurrentIndex(0);
  }, [order, onlyChanged, fromISO, useSnapshot, snapshotId, snapshots]);

  React.useEffect(() => {
    if (!autoPlay || deltas.length === 0) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const timer = window.setTimeout(() => {
      setCurrentIndex((previous) => {
        const next = previous + 1;
        return next >= deltas.length ? 0 : next;
      });
    }, Math.max(4000, durationSeconds * 1000));
    return () => window.clearTimeout(timer);
  }, [autoPlay, currentIndex, deltas.length, durationSeconds]);

  const current = deltas[currentIndex];
  const durationMs = Math.max(4000, durationSeconds * 1000);

  const handleManualAdvance = (step: number) => {
    if (deltas.length === 0) {
      return;
    }
    setCurrentIndex((previous) => {
      const next = (previous + step + deltas.length) % deltas.length;
      return next;
    });
  };

  const headerControls = (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
          Baseline: Snapshot
          <span>
            <input
              type="checkbox"
              checked={useSnapshot}
              onChange={(event) => setUseSnapshot(event.target.checked)}
              style={{ marginRight: 6 }}
            />
            {snapshots.length === 0 && <span style={{ marginLeft: 4 }}>Keine Snapshots verfügbar</span>}
          </span>
        </label>
        {useSnapshot ? (
          <select
            value={snapshotId}
            onChange={(event) => setSnapshotId(event.target.value || undefined)}
            style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.4)' }}
          >
            {snapshots.map((snapshot) => (
              <option value={snapshot.id} key={snapshot.id}>
                {formatDateLabel(snapshot)}
              </option>
            ))}
          </select>
        ) : (
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: 13 }}>
            Startzeit (optional)
            <input
              type="datetime-local"
              value={fromInput}
              onChange={(event) => {
                const value = event.target.value;
                setFromInput(value);
                setFromISO(value ? new Date(value).toISOString() : undefined);
              }}
              style={{ marginTop: 4, padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.4)' }}
            />
          </label>
        )}
        <label style={{ fontSize: 13 }}>
          Reihenfolge
          <select
            value={order}
            onChange={(event) => setOrder(event.target.value as Order)}
            style={{ marginLeft: 6, padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.4)' }}
          >
            <option value="alpha">Alphabetisch</option>
            <option value="delta">XP-Delta</option>
            <option value="random">Zufällig</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: 13 }}>
          <input
            type="checkbox"
            checked={onlyChanged}
            onChange={(event) => setOnlyChanged(event.target.checked)}
            style={{ marginRight: 6 }}
          />
          Nur Veränderungen
        </label>
      </div>
      <button
        type="button"
        onClick={() => setSnapshots(listSnapshots())}
        style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid rgba(148,163,184,0.4)', background: 'rgba(15,23,42,0.35)', color: '#e2e8f0' }}
      >
        Snapshots aktualisieren
      </button>
    </div>
  );

  const footerControls = (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => handleManualAdvance(-1)}
          disabled={deltas.length === 0}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.4)',
            background: 'rgba(15,23,42,0.35)',
            color: '#e2e8f0',
            cursor: deltas.length === 0 ? 'not-allowed' : 'pointer',
            opacity: deltas.length === 0 ? 0.6 : 1,
          }}
        >
          Zurück
        </button>
        <button
          type="button"
          onClick={() => setAutoPlay((value) => !value)}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.4)',
            background: autoPlay ? '#4ade80' : 'rgba(15,23,42,0.35)',
            color: autoPlay ? '#0f172a' : '#e2e8f0',
            fontWeight: 600,
          }}
        >
          {autoPlay ? 'Pause' : 'Abspielen'}
        </button>
        <button
          type="button"
          onClick={() => handleManualAdvance(1)}
          disabled={deltas.length === 0}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.4)',
            background: 'rgba(15,23,42,0.35)',
            color: '#e2e8f0',
            cursor: deltas.length === 0 ? 'not-allowed' : 'pointer',
            opacity: deltas.length === 0 ? 0.6 : 1,
          }}
        >
          Weiter
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          Dauer (Sek.)
          <input
            type="number"
            min={4}
            max={30}
            value={durationSeconds}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(value)) {
                setDurationSeconds(Math.min(30, Math.max(4, value)));
              }
            }}
            style={{ width: 72, padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(148,163,184,0.4)' }}
          />
        </label>
      </div>
      <div style={{ fontSize: 14, opacity: 0.85 }}>
        {deltas.length === 0 ? 'Keine Einträge' : `Slide ${currentIndex + 1} von ${deltas.length}`}
      </div>
    </div>
  );

  return (
    <div style={BACKGROUND_STYLE}>
      <header style={{ padding: '20px 24px', borderBottom: '1px solid rgba(148,163,184,0.3)' }}>{headerControls}</header>
      <main
        style={{
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
        }}
      >
        {current ? (
          <WeeklyShowSlide key={current.studentId} data={current} durationMs={durationMs} />
        ) : (
          <div
            style={{
              padding: 36,
              borderRadius: 24,
              background: 'rgba(15,23,42,0.7)',
              border: '1px solid rgba(148,163,184,0.3)',
              maxWidth: 520,
              textAlign: 'center',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Keine Daten für diese Auswahl</h2>
            <p style={{ marginBottom: 0 }}>
              Lege einen Snapshot an oder wähle einen anderen Zeitraum, um Fortschritte zu sehen.
            </p>
          </div>
        )}
      </main>
      <footer style={{ padding: '20px 24px', borderTop: '1px solid rgba(148,163,184,0.3)' }}>{footerControls}</footer>
    </div>
  );
}
