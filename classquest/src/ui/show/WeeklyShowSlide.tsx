import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '~/app/AppContext';
import { AvatarView } from '~/ui/avatar/AvatarView';
import { BadgeIcon } from '~/ui/components/BadgeIcon';
import EvolutionSequence from '~/ui/show/EvolutionSequence';
import WeeklyClassGoalRocket from '~/ui/show/WeeklyClassGoalRocket';
import type { WeeklyDelta } from '~/core/show/weekly';
import { eventBus } from '~/lib/EventBus';

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
  const [showCurrentStage, setShowCurrentStage] = React.useState(false);
  const [avatarReady, setAvatarReady] = React.useState(false);
  const xpGain = Math.max(0, data.xpEnd - data.xpStart);
  const levelGain = Math.max(0, data.levelEnd - data.levelStart);
  const hasNewBadges = data.newBadges.length > 0;
  const evolved = data.avatarStageEnd > data.avatarStageStart;
  const badgeTimers = React.useRef<number[]>([]);
  const badgeSoundTriggered = React.useRef(false);
  const avatarSoundTriggered = React.useRef(false);

  React.useEffect(() => {
    badgeTimers.current.forEach((id) => window.clearTimeout(id));
    badgeTimers.current = [];
    badgeSoundTriggered.current = false;
    avatarSoundTriggered.current = false;
    setAvatarReady(false);
  }, [data.studentId]);
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
    setAvatarReady(false);
    if (typeof window === 'undefined') {
      return;
    }
    const timer = window.setTimeout(() => setShowCurrentStage(true), 120);
    return () => window.clearTimeout(timer);
  }, [data.studentId]);

  React.useEffect(() => {
    if (showCurrentStage && !evolved) {
      setAvatarReady(true);
    }
  }, [showCurrentStage, evolved]);

  React.useEffect(() => {
    if (!avatarReady || avatarSoundTriggered.current) {
      return;
    }
    avatarSoundTriggered.current = true;
    eventBus.emit({ type: 'slideshow:avatar:present', studentId: data.studentId });
  }, [avatarReady, data.studentId]);

  React.useEffect(() => {
    if (!hasNewBadges || badgeSoundTriggered.current) {
      return;
    }
    if (phase !== 'badges' && phase !== 'done') {
      return;
    }

    badgeSoundTriggered.current = true;

    if (typeof window === 'undefined') {
      data.newBadges.forEach((badge) => eventBus.emit({ type: 'slideshow:badge:flyin', badgeId: badge.id }));
      return;
    }

    data.newBadges.forEach((badge, index) => {
      const id = window.setTimeout(
        () => eventBus.emit({ type: 'slideshow:badge:flyin', badgeId: badge.id }),
        index * 140,
      );
      badgeTimers.current.push(id);
    });

    return () => {
      badgeTimers.current.forEach((id) => window.clearTimeout(id));
      badgeTimers.current = [];
    };
  }, [data.newBadges, hasNewBadges, phase]);

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

  const showBadges = hasNewBadges;
  const badgesVisible = phase === 'badges' || phase === 'done';
  const levelVisible = phase === 'level' || badgesVisible;
  const xpVisible = phase !== 'intro';

  const riseUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  } as const;

  const badgeList = (
    <motion.div variants={riseUp} initial="hidden" animate={badgesVisible ? 'visible' : 'hidden'} style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 20 }}>Neue Badges</h3>
      <motion.ul
        variants={{
          hidden: { opacity: 0, y: 12 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { staggerChildren: 0.08, delayChildren: 0.05, ease: 'easeOut' },
          },
        }}
        initial="hidden"
        animate={badgesVisible ? 'visible' : 'hidden'}
        style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'grid',
          gap: 12,
        }}
      >
        {data.newBadges.map((badge) => (
          <motion.li
            variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 180, damping: 18 } } }}
            key={badge.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 12,
              background: 'rgba(15,23,42,0.35)',
              border: '1px solid rgba(148,163,184,0.25)',
              boxShadow: '0 14px 32px rgba(8,47,73,0.35)',
            }}
          >
            <BadgeIcon name={badge.name} iconKey={badge.iconKey} size={52} />
            <div style={{ display: 'grid', gap: 4 }}>
              <strong>{badge.name}</strong>
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                Verliehen am {new Date(badge.awardedAt).toLocaleDateString('de-DE')}
              </span>
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );

  const metricStyle: React.CSSProperties = {
    padding: '16px 20px',
    borderRadius: 16,
    background: 'rgba(15,23,42,0.3)',
    display: 'grid',
    gap: 4,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        width: '100%',
        maxWidth: 960,
        background: 'radial-gradient(circle at 20% 20%, rgba(56,189,248,0.08), transparent 35%), rgba(15,23,42,0.82)',
        color: '#e2e8f0',
        padding: 36,
        borderRadius: 28,
        boxShadow: '0 20px 60px rgba(15,23,42,0.45)',
        display: 'grid',
        gap: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 16,
          borderRadius: 24,
          background: 'linear-gradient(120deg, rgba(236,72,153,0.05), rgba(14,165,233,0.08))',
          filter: 'blur(22px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          display: 'grid',
          gap: 24,
          gridTemplateColumns: 'minmax(200px, 240px) 1fr',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ position: 'relative', justifySelf: 'center' }}
        >
          <div
            style={{
              position: 'relative',
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: -22,
                background: 'radial-gradient(circle at 40% 40%, rgba(56,189,248,0.18), transparent 55%)',
                filter: 'blur(28px)',
              }}
            />
            {evolved ? (
              <EvolutionSequence
                student={student}
                fromStage={data.avatarStageStart}
                toStage={data.avatarStageEnd}
                size={AVATAR_SIZE}
                totalMs={2200}
                onDone={() => setAvatarReady(true)}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: showCurrentStage ? 1 : 0, scale: showCurrentStage ? 1 : 0.98 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AvatarView student={student} size={AVATAR_SIZE} rounded="xl" />
              </motion.div>
            )}
          </div>
        </motion.div>
        <div style={{ display: 'grid', gap: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ fontSize: 14, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.7 }}
            >
              Fortschritt der Woche
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{ margin: 0, fontSize: 36 }}
            >
              {student.alias}
            </motion.h2>
          </div>
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              alignItems: 'stretch',
            }}
          >
            <motion.div variants={riseUp} initial="hidden" animate={xpVisible ? 'visible' : 'hidden'}>
              <WeeklyClassGoalRocket />
            </motion.div>
            <div style={{ display: 'grid', gap: 12 }}>
              <motion.div variants={riseUp} initial="hidden" animate={xpVisible ? 'visible' : 'hidden'} style={metricStyle}>
                <span style={{ fontSize: 14, opacity: 0.75 }}>XP</span>
                <strong style={{ fontSize: 28 }}>
                  {xpGain > 0 ? `+${formatNumber(xpGain)} XP` : 'Keine neuen XP'}
                </strong>
                <span style={{ fontSize: 14, opacity: 0.75 }}>
                  {formatNumber(data.xpStart)} → {formatNumber(data.xpEnd)}
                </span>
              </motion.div>
              <motion.div variants={riseUp} initial="hidden" animate={levelVisible ? 'visible' : 'hidden'} style={metricStyle}>
                <span style={{ fontSize: 14, opacity: 0.75 }}>Level</span>
                <strong style={{ fontSize: 28 }}>
                  {data.levelStart} → {data.levelEnd}
                </strong>
                <span style={{ fontSize: 14, opacity: 0.75 }}>
                  {levelGain > 0 ? `+${levelGain} Level` : 'Stufe gehalten'}
                </span>
                {evolved && <span style={{ fontSize: 13, color: '#fde047' }}>Avatar ist eine Stufe aufgestiegen!</span>}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      {showBadges ? (
        badgeList
      ) : (
        <motion.div variants={riseUp} initial="hidden" animate={badgesVisible ? 'visible' : 'hidden'} style={{ ...metricStyle, textAlign: 'center' }}>
          <span style={{ fontSize: 14, opacity: 0.75 }}>Badges</span>
          <strong style={{ fontSize: 24 }}>Keine neuen Badges</strong>
        </motion.div>
      )}
    </motion.div>
  );
}
