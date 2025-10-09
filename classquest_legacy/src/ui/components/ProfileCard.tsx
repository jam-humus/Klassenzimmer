import { useMemo } from 'react';
import { useApp } from '~/app/AppContext';
import { selectStudentById } from '~/core/selectors/student';
import { AvatarView } from '~/ui/avatar/AvatarView';
import { BadgeIcon } from '~/ui/components/BadgeIcon';
import type { Badge } from '~/types/models';

const numberFormatter = new Intl.NumberFormat('de-DE');

const formatNumber = (value: number) => numberFormatter.format(Math.max(0, Math.round(value)));

const MAX_BADGES_DISPLAYED = 16;

const sortBadgesByAwardedAt = (badges: Badge[]): Badge[] => {
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
};

type ProfileCardProps = {
  studentId: string;
  titleId?: string;
};

export function ProfileCard({ studentId, titleId }: ProfileCardProps) {
  const { state } = useApp();

  const student = useMemo(
    () => selectStudentById({ students: state.students }, studentId),
    [state.students, studentId],
  );

  const classMaxXp = useMemo(() => {
    let max = 0;
    for (const entry of state.students) {
      const xp = entry?.xp ?? 0;
      if (xp > max) {
        max = xp;
      }
    }
    return Math.max(1, max);
  }, [state.students]);

  if (!student) {
    return null;
  }

  const xpPerLevelSetting = state.settings?.xpPerLevel ?? 100;
  const xpPerLevel = Math.max(1, Math.round(xpPerLevelSetting));
  const level = Math.max(1, Math.round(student.level ?? 1));
  const xpTotal = Math.max(0, Math.round(student.xp ?? 0));
  const baseXpForLevel = (level - 1) * xpPerLevel;
  const rawInLevel = xpTotal - baseXpForLevel;
  const inLevel = Math.max(0, Math.min(xpPerLevel, rawInLevel));
  const ratio = classMaxXp > 0 ? Math.min(1, xpTotal / classMaxXp) : 0;

  const badges = Array.isArray(student.badges) ? student.badges : [];
  const recentBadges = sortBadgesByAwardedAt(badges).slice(0, MAX_BADGES_DISPLAYED);

  return (
    <article
      aria-label="Profilkarte"
      style={{
        margin: '0 auto',
        width: '100%',
        maxWidth: 420,
        display: 'grid',
        gap: 24,
        padding: 24,
        borderRadius: 28,
        border: '1px solid rgba(15,23,42,0.08)',
        background: 'linear-gradient(180deg, #ffffff, #f8fafc)',
        boxShadow: '0 36px 64px rgba(15,23,42,0.15)',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: 999,
            background: 'radial-gradient(45% 45% at 50% 50%, rgba(255,107,53,0.28), transparent 70%)',
            filter: 'blur(40px)',
            opacity: 0.8,
          }}
        />
        <AvatarView
          student={{
            alias: student.alias,
            avatarMode: student.avatarMode,
            avatarPack: student.avatarPack,
            level: student.level,
            xp: student.xp,
          }}
          size={200}
          rounded="xl"
          style={{ boxShadow: '0 18px 32px rgba(15,23,42,0.25)' }}
        />
      </div>

      <div style={{ textAlign: 'center', display: 'grid', gap: 8 }}>
        <h2
          id={titleId}
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.01em',
          }}
        >
          {student.alias}
        </h2>
        <div
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            fontSize: 12,
            fontWeight: 600,
            color: '#64748b',
          }}
        >
          Level
        </div>
        <div style={{ fontSize: 46, fontWeight: 900, color: '#0f172a' }}>{formatNumber(level)}</div>
        <div style={{ fontSize: 13, color: '#475569' }}>
          {formatNumber(inLevel)} / {formatNumber(xpPerLevel)} XP in diesem Level
        </div>
      </div>

      <section style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ margin: 0, textAlign: 'center', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Badges</h3>
        {recentBadges.length === 0 ? (
          <p style={{ margin: 0, textAlign: 'center', fontSize: 14, color: '#64748b' }}>
            Noch keine Badges vergeben.
          </p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 10,
              maxHeight: 120,
              overflowY: 'auto',
            }}
          >
            {recentBadges.map((badge) => (
              <li
                key={`${badge.id}-${badge.awardedAt}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(15,23,42,0.12)',
                  background: 'rgba(148,163,184,0.12)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <BadgeIcon name={badge.name} iconKey={badge.iconKey} size={36} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{badge.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#475569' }}>
          <span>Gesamt-XP</span>
          <strong style={{ fontSize: 15, color: '#0f172a' }}>{formatNumber(xpTotal)} XP</strong>
        </div>
        <div
          aria-hidden
          style={{
            width: '100%',
            height: 12,
            borderRadius: 999,
            background: 'rgba(148,163,184,0.25)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.round(ratio * 100)}%`,
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #34d399, #38bdf8)',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
          Klassenbestwert: {formatNumber(classMaxXp)} XP
        </div>
      </section>
    </article>
  );
}

export default ProfileCard;
