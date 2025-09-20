import React from 'react';
import { useApp } from '~/app/AppContext';
import { selectClassProgress } from '~/core/selectors/classProgress';
import { getObjectURL } from '~/services/blobStore';

const numberFormatter = new Intl.NumberFormat('de-DE');

export function ClassProgressBar() {
  const { state } = useApp();
  const { step, total, stars, nextTarget, remaining, ratio } = selectClassProgress(state);
  const starLabel = state.settings.classStarsName ?? 'Stern';
  const percent = Math.round(ratio * 100);
  const [starIconUrl, setStarIconUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const key = state.settings.classStarIconKey ?? null;
    if (!key) {
      setStarIconUrl(null);
      return undefined;
    }
    (async () => {
      try {
        const url = await getObjectURL(key);
        if (!cancelled) {
          setStarIconUrl(url);
        }
      } catch (error) {
        console.warn('Stern-Icon konnte nicht geladen werden', error);
        if (!cancelled) {
          setStarIconUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.settings.classStarIconKey]);

  return (
    <section
      aria-label="Klassenfortschritt"
      style={{
        padding: '16px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(59,130,246,0.08))',
        border: '1px solid rgba(15,23,42,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Klassen-XP</h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(15,23,42,0.68)', fontSize: 14 }} aria-live="polite">
            {numberFormatter.format(total)} / {numberFormatter.format(nextTarget)} XP · noch{' '}
            {numberFormatter.format(remaining)} XP bis zum nächsten {starLabel}
          </p>
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 26, fontWeight: 700, color: '#047857' }}
          aria-label="Gesammelte Sterne"
        >
          {starIconUrl ? (
            <img src={starIconUrl} alt="" aria-hidden style={{ width: 28, height: 28, objectFit: 'contain' }} />
          ) : (
            <span aria-hidden>⭐</span>
          )}
          <span>{numberFormatter.format(stars)}</span>
        </div>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${percent}%`}
        style={{
          position: 'relative',
          height: 12,
          borderRadius: 999,
          background: 'rgba(15,23,42,0.08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(16,185,129,0.9), rgba(5,150,105,1))',
            transition: 'width 160ms ease-out',
          }}
        />
      </div>
      <div style={{ fontSize: 12, color: 'rgba(15,23,42,0.6)' }}>Stern-Schrittgröße: {numberFormatter.format(step)} XP</div>
    </section>
  );
}
