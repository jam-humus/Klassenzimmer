import React from 'react';
import { useApp } from '~/app/AppContext';
import { selectClassProgressView } from '~/core/selectors/classProgress';
import { getObjectURL } from '~/services/blobStore';
import {
  classProgressNumberFormatter,
  getFormattedClassProgressCopy,
} from '~/ui/components/classProgressFormatting';

export function ClassProgressBar() {
  const { state } = useApp();
  const view = selectClassProgressView(state);
  const starLabel = state.settings.classStarsName ?? 'Stern';
  const percent = Math.round(view.pct * 100);
  const { formattedCurrent, formattedStep, formattedRemaining, announcement } =
    getFormattedClassProgressCopy(view, starLabel);
  const formattedStars = classProgressNumberFormatter.format(view.stars);
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
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Klassen-XP</h2>
          <p style={{ margin: '6px 0 0', color: 'rgba(15,23,42,0.7)', fontSize: 14 }} aria-live="polite">
            {announcement}
          </p>
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          aria-label={`Gesammelte ${starLabel}: ${formattedStars}`}
        >
          <StarBadge iconUrl={starIconUrl} />
          <span style={{ fontSize: 28, fontWeight: 700, color: '#047857' }}>{formattedStars}</span>
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
          height: 14,
          borderRadius: 999,
          background: 'rgba(15,23,42,0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(16,185,129,1), rgba(5,150,105,0.9))',
            boxShadow: '0 0 12px rgba(16,185,129,0.45)',
            transition: 'width 300ms ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'rgba(15,23,42,0.65)' }}>
        <div>Aktueller Fortschritt: {formattedCurrent} XP</div>
        <div>Noch {formattedRemaining} XP bis zum nächsten Schritt</div>
        <div>Schrittgröße: {formattedStep} XP</div>
      </div>
    </section>
  );
}

function StarBadge({ iconUrl }: { iconUrl: string | null }) {
  if (iconUrl) {
    return (
      <img
        src={iconUrl}
        alt=""
        aria-hidden
        style={{
          width: 32,
          height: 32,
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 12px rgba(255,210,107,0.6))',
        }}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 32,
        height: 32,
        background: 'conic-gradient(from 0deg, #ffd26b, #fff2a1, #ffd26b)',
        filter: 'drop-shadow(0 4px 12px rgba(255,210,107,0.65))',
        WebkitMaskImage:
          "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><path fill=%22black%22 d=%22M12 2l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 8.8l6.5-.9z%22/></svg>')",
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  );
}
