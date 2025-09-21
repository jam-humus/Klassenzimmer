import React from 'react';
import { useApp } from '~/app/AppContext';
import { AvatarView } from '~/ui/avatar/AvatarView';
import { BadgeIcon } from '~/ui/components/BadgeIcon';
import { getAvatarStageUrl } from '~/core/show/avatarStageUrl';
import type { WeeklyDelta } from '~/core/show/weekly';

const AVATAR_SIZE = 220;

type WeeklyShowSlideProps = {
  data: WeeklyDelta;
  durationMs?: number;
};

function formatNumber(value: number): string {
  return value.toLocaleString('de-DE');
}

export default function WeeklyShowSlide({ data, durationMs = 12000 }: WeeklyShowSlideProps) {
  const { state } = useApp();
  const student = state.students.find((entry) => entry.id === data.studentId);
  const [phase, setPhase] = React.useState<'intro' | 'xp' | 'level' | 'badges' | 'done'>('intro');
  const [previousStageUrl, setPreviousStageUrl] = React.useState<string | null>(null);
  const [showCurrentStage, setShowCurrentStage] = React.useState(false);

  React.useEffect(() => {
    setPhase('intro');
    const timers: number[] = [];
    if (typeof window !== 'undefined') {
      timers.push(window.setTimeout(() => setPhase('xp'), Math.min(2200, durationMs * 0.25)));
      timers.push(window.setTimeout(() => setPhase('level'), Math.min(5200, durationMs * 0.48)));
      timers.push(window.setTimeout(() => setPhase('badges'), Math.min(9200, durationMs * 0.76)));
      timers.push(window.setTimeout(() => setPhase('done'), durationMs));
    }
    return () => {
      timers.forEach((id) => {
        if (typeof window !== 'undefined') {
          window.clearTimeout(id);
        }
      });
    };
  }, [data.studentId, durationMs]);

  React.useEffect(() => {
    setShowCurrentStage(false);
    if (typeof window === 'undefined') {
      return;
    }
    const timer = window.setTimeout(() => setShowCurrentStage(true), 120);
    return () => window.clearTimeout(timer);
  }, [data.studentId]);

  React.useEffect(() => {
    let cancelled = false;
    if (!student || data.avatarStageEnd <= data.avatarStageStart) {
      setPreviousStageUrl(null);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      const url = await getAvatarStageUrl(state, student, data.avatarStageStart);
      if (!cancelled) {
        setPreviousStageUrl(url);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [student, state, data.avatarStageStart, data.avatarStageEnd]);

  if (!student) {
    return (
      <div
        style={{
          background: 'rgba(15,23,42,0.75)',
          padding: 32,
          borderRadius: 24,
          color: '#e2e8f0',
          maxWidth: 720,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0 }}>Schüler nicht gefunden.</p>
      </div>
    );
  }

  const xpGain = Math.max(0, data.xpEnd - data.xpStart);
  const levelGain = Math.max(0, data.levelEnd - data.levelStart);
  const evolved = data.avatarStageEnd > data.avatarStageStart;
  const showBadges = data.newBadges.length > 0;

  const badgeList = (
    <div
      style={{
        display: 'grid',
        gap: 12,
        opacity: phase === 'badges' || phase === 'done' ? 1 : 0,
        transform: phase === 'badges' || phase === 'done' ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <h3 style={{ margin: 0, fontSize: 20 }}>Neue Badges</h3>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 12,
        }}
      >
        {data.newBadges.map((badge) => (
          <li
            key={badge.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              borderRadius: 12,
              background: 'rgba(15,23,42,0.3)',
            }}
          >
            <BadgeIcon name={badge.name} iconKey={badge.iconKey} size={48} />
            <div style={{ display: 'grid', gap: 4 }}>
              <strong>{badge.name}</strong>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                Verliehen am {new Date(badge.awardedAt).toLocaleDateString('de-DE')}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );

  const metricStyle: React.CSSProperties = {
    padding: '16px 20px',
    borderRadius: 16,
    background: 'rgba(15,23,42,0.3)',
    display: 'grid',
    gap: 4,
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 960,
        background: 'rgba(15,23,42,0.8)',
        color: '#e2e8f0',
        padding: 36,
        borderRadius: 28,
        boxShadow: '0 20px 60px rgba(15,23,42,0.45)',
        display: 'grid',
        gap: 24,
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'minmax(200px, 240px) 1fr',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', justifySelf: 'center' }}>
          {evolved && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: -24,
                left: -24,
                right: -24,
                bottom: -24,
                borderRadius: AVATAR_SIZE,
                background:
                  'radial-gradient(circle at center, rgba(253,224,71,0.4), rgba(253,224,71,0) 70%)',
                filter: 'blur(12px)',
              }}
            />
          )}
          <div
            style={{
              position: 'relative',
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
            }}
          >
            {previousStageUrl && (
              <img
                src={previousStageUrl}
                alt="Vorheriger Avatar"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: AVATAR_SIZE / 2,
                  opacity: showCurrentStage ? 0 : 1,
                  transition: 'opacity 0.6s ease',
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: showCurrentStage ? 1 : 0,
                transition: 'opacity 0.6s ease',
              }}
            >
              <AvatarView student={student} size={AVATAR_SIZE} rounded="xl" />
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 14, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.7 }}>
              Fortschritt der Woche
            </span>
            <h2 style={{ margin: 0, fontSize: 36 }}>{student.alias}</h2>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div
              style={{
                ...metricStyle,
                opacity: phase === 'intro' ? 0 : 1,
                transform: phase === 'intro' ? 'translateY(12px)' : 'translateY(0)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
              }}
            >
              <span style={{ fontSize: 14, opacity: 0.75 }}>XP</span>
              <strong style={{ fontSize: 28 }}>
                {xpGain > 0 ? `+${formatNumber(xpGain)} XP` : 'Keine neuen XP'}
              </strong>
              <span style={{ fontSize: 14, opacity: 0.75 }}>
                {formatNumber(data.xpStart)} → {formatNumber(data.xpEnd)}
              </span>
            </div>
            <div
              style={{
                ...metricStyle,
                opacity: phase === 'level' || phase === 'badges' || phase === 'done' ? 1 : 0,
                transform:
                  phase === 'level' || phase === 'badges' || phase === 'done'
                    ? 'translateY(0)'
                    : 'translateY(12px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
              }}
            >
              <span style={{ fontSize: 14, opacity: 0.75 }}>Level</span>
              <strong style={{ fontSize: 28 }}>
                {data.levelStart} → {data.levelEnd}
              </strong>
              <span style={{ fontSize: 14, opacity: 0.75 }}>
                {levelGain > 0 ? `+${levelGain} Level` : 'Stufe gehalten'}
              </span>
              {evolved && <span style={{ fontSize: 13, color: '#fde047' }}>Avatar ist eine Stufe aufgestiegen!</span>}
            </div>
          </div>
        </div>
      </div>
      {showBadges ? badgeList : (
        <div
          style={{
            ...metricStyle,
            opacity: phase === 'badges' || phase === 'done' ? 1 : 0,
            transform:
              phase === 'badges' || phase === 'done' ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 14, opacity: 0.75 }}>Badges</span>
          <strong style={{ fontSize: 24 }}>Keine neuen Badges</strong>
        </div>
      )}
    </div>
  );
}
