import { useMemo, useState } from 'react';
import { AvatarView } from '~/ui/avatar/AvatarView';
import AwardBadgeButton from '~/ui/components/AwardBadgeButton';
import { TrophyGrid } from '~/ui/components/badges/TrophyGrid';
import { AvatarZoomModal } from '~/ui/components/ui/AvatarZoomModal';
import type { Badge, Student } from '~/types/models';
import { navigateToAwardScreen } from '~/ui/student/navigate';

const numberFormatter = new Intl.NumberFormat('de-DE');

const formatNumber = (value: number) => numberFormatter.format(Math.max(0, Math.round(value)));

type StudentCategoryStat = {
  name: string;
  xp: number;
};

type StudentProfileCardV2Props = {
  student: Student;
  xpPerLevel: number;
  teamName?: string | null;
  categories: StudentCategoryStat[];
  categoriesTotal: number;
  onAwardQuest?: (student: Student) => void;
};

type LevelProgress = {
  inLevel: number;
  remaining: number;
  ratio: number;
  nextLevel: number;
  totalXp: number;
};

function computeLevelProgress(student: Student, xpPerLevelSetting: number): LevelProgress {
  const xpPerLevel = Math.max(1, Math.round(xpPerLevelSetting));
  const level = Math.max(1, Math.round(student.level ?? 1));
  const xpTotal = Math.max(0, Math.round(student.xp ?? 0));
  const baseXp = (level - 1) * xpPerLevel;
  const rawInLevel = xpTotal - baseXp;
  const inLevel = Math.max(0, Math.min(xpPerLevel, rawInLevel));
  const remaining = Math.max(0, xpPerLevel - inLevel);
  const ratio = xpPerLevel > 0 ? Math.min(1, inLevel / xpPerLevel) : 0;
  return {
    inLevel,
    remaining,
    ratio,
    nextLevel: level + 1,
    totalXp: xpTotal,
  };
}

function normalizeCategoryName(name: string) {
  if (!name || name === 'uncategorized') {
    return 'Sonstiges';
  }
  return name;
}

function sortBadges(badges: Badge[]): Badge[] {
  const list = [...badges];
  list.sort((a, b) => {
    const timeA = Date.parse(a.awardedAt);
    const timeB = Date.parse(b.awardedAt);
    if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
    if (Number.isNaN(timeA)) return 1;
    if (Number.isNaN(timeB)) return -1;
    return timeB - timeA;
  });
  return list;
}

export function StudentProfileCardV2({
  student,
  xpPerLevel,
  teamName,
  categories,
  categoriesTotal,
  onAwardQuest,
}: StudentProfileCardV2Props) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const progress = useMemo(() => computeLevelProgress(student, xpPerLevel), [student, xpPerLevel]);
  const badges = useMemo(() => sortBadges(student.badges ?? []), [student.badges]);
  const topCategories = useMemo(() => {
    const relevant = categories.filter((entry) => entry.xp > 0);
    relevant.sort((a, b) => b.xp - a.xp);
    return relevant.slice(0, 3);
  }, [categories]);

  const handleAwardQuest = () => {
    if (onAwardQuest) {
      onAwardQuest(student);
      return;
    }
    navigateToAwardScreen(student.id);
  };

  const openZoom = () => setZoomOpen(true);
  const closeZoom = () => setZoomOpen(false);

  const levelPill = (
    <span
      style={{
        padding: '6px 14px',
        borderRadius: 999,
        background: 'linear-gradient(90deg, #f97316, #fb7185)',
        color: 'rgba(15,23,42,0.85)',
        fontWeight: 700,
        fontSize: 14,
        boxShadow:
          '0 0 0 1px rgba(15,23,42,0.18), 0 12px 28px rgba(249,115,22,0.35)',
        textShadow: '0 1px 0 rgba(255,255,255,0.45)',
      }}
    >
      Level {student.level}
    </span>
  );

  return (
    <article
      aria-label={`Profil von ${student.alias}`}
      style={{
        display: 'grid',
        gap: 24,
        padding: 'clamp(24px, 4vw, 32px)',
        borderRadius: 32,
        border: '1px solid rgba(148,163,184,0.35)',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.82))',
        boxShadow: '0 32px 80px rgba(15,23,42,0.35)',
        color: '#f8fafc',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'stretch',
        }}
      >
        <button
          type="button"
          onClick={openZoom}
          aria-label="Profilbild vergrößern"
          style={{
            border: 'none',
            padding: 0,
            background: 'transparent',
            cursor: 'zoom-in',
            flex: '0 0 200px',
            borderRadius: 28,
            position: 'relative',
            boxShadow: '0 24px 60px rgba(14,116,144,0.45)',
          }}
        >
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
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 28,
              boxShadow: '0 18px 48px rgba(14,116,144,0.4)',
            }}
          />
        </button>
        <div
          style={{
            flex: '1 1 280px',
            minWidth: 240,
            display: 'grid',
            gap: 16,
            alignContent: 'start',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  color: '#f8fafc',
                }}
              >
                {student.alias}
              </h1>
              <div style={{ fontSize: 14, color: 'rgba(226,232,240,0.85)' }}>
                Gesamt: {formatNumber(progress.totalXp)} XP
                {teamName ? ` · Team ${teamName}` : ''}
              </div>
            </div>
            {levelPill}
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 14,
                color: 'rgba(226,232,240,0.85)',
              }}
            >
              <span>Level-Fortschritt</span>
              <span style={{ fontWeight: 600, color: '#f8fafc' }}>
                {formatNumber(progress.inLevel)} / {formatNumber(xpPerLevel)} XP
              </span>
            </div>
            <div
              aria-hidden
              style={{
                height: 14,
                borderRadius: 999,
                background: 'rgba(15,23,42,0.16)',
                overflow: 'hidden',
                border: '1px solid rgba(15,23,42,0.24)',
              }}
            >
              <div
                style={{
                  width: `${Math.round(progress.ratio * 100)}%`,
                  height: '100%',
                  borderRadius: 999,
                  background:
                    'linear-gradient(90deg, var(--accent), color-mix(in oklab, var(--accent), white 12%))',
                  boxShadow: '0 10px 24px rgba(34,211,238,0.25)',
                }}
              />
            </div>
            <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.8)' }}>
              {formatNumber(progress.remaining)} XP bis Level {progress.nextLevel}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={handleAwardQuest}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: 'none',
                background: 'linear-gradient(90deg, #f97316, #facc15)',
                color: '#0f172a',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 16px 36px rgba(250,204,21,0.35)',
              }}
            >
              ⚡ XP/Quest vergeben
            </button>
            <AwardBadgeButton student={student} />
          </div>
        </div>
      </div>

      <section style={{ display: 'grid', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, lineHeight: '1.6', color: '#e2e8f0' }}>Top-Kategorien</h2>
        {topCategories.length === 0 ? (
          <p style={{ margin: 0, color: 'rgba(226,232,240,0.75)' }}>Noch keine Kategorien vergeben.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {topCategories.map((entry) => {
              const ratio = categoriesTotal > 0 ? Math.round((entry.xp / categoriesTotal) * 100) : 0;
              return (
                <span
                  key={entry.name}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: 'rgba(148,163,184,0.18)',
                    border: '1px solid rgba(148,163,184,0.35)',
                    fontSize: 13,
                    color: '#f8fafc',
                  }}
                >
                  <strong style={{ fontWeight: 700 }}>{normalizeCategoryName(entry.name)}</strong>{' '}
                  · {formatNumber(entry.xp)} XP ({ratio}%)
                </span>
              );
            })}
          </div>
        )}
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#f8fafc' }}>Trophäenschrank</h2>
          <span style={{ fontSize: 13, color: 'rgba(226,232,240,0.8)' }}>
            {badges.length} {badges.length === 1 ? 'Abzeichen' : 'Abzeichen'}
          </span>
        </header>
        <TrophyGrid badges={badges} />
      </section>

      <AvatarZoomModal
        open={zoomOpen}
        onClose={closeZoom}
        student={{
          alias: student.alias,
          avatarMode: student.avatarMode,
          avatarPack: student.avatarPack,
          level: student.level,
          xp: student.xp,
        }}
      />
    </article>
  );
}

export default StudentProfileCardV2;
