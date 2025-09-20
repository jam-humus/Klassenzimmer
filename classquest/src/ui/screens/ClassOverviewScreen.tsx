import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useApp } from '~/app/AppContext';
import { AvatarView } from '~/ui/avatar/AvatarView';
import { BadgeIcon } from '~/ui/components/BadgeIcon';
import { selectLogsForStudent, selectStudentById } from '~/core/selectors/student';
import { selectStudentCategoryXp } from '~/core/selectors/badges';
import type { LogEntry, Student } from '~/types/models';

const numberFormatter = new Intl.NumberFormat('de-DE');

function formatNumber(value: number) {
  return numberFormatter.format(Math.max(0, Math.round(value)));
}

function formatTimestamp(timestamp: number) {
  try {
    return new Date(timestamp).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  } catch (error) {
    console.warn('Zeitstempel konnte nicht formatiert werden', error);
    return new Date(timestamp).toLocaleString();
  }
}

type LevelProgress = {
  inLevel: number;
  remaining: number;
  ratio: number;
  xpPerLevel: number;
  nextLevel: number;
};

function computeLevelProgress(student: Student, xpPerLevelSetting: number): LevelProgress {
  const xpPerLevel = Math.max(1, Math.round(xpPerLevelSetting));
  const level = Math.max(1, Math.round(student.level ?? 1));
  const baseXp = (level - 1) * xpPerLevel;
  const rawInLevel = student.xp - baseXp;
  const inLevel = Math.max(0, Math.min(xpPerLevel, rawInLevel));
  const ratio = xpPerLevel > 0 ? Math.min(1, inLevel / xpPerLevel) : 0;
  const remaining = Math.max(0, xpPerLevel - inLevel);
  return {
    inLevel,
    remaining,
    ratio,
    xpPerLevel,
    nextLevel: level + 1,
  };
}

type CategoryEntry = {
  name: string;
  xp: number;
};

type ProfilePaneProps = {
  student: Student;
  teamName: string | null;
  logs: LogEntry[];
  categories: CategoryEntry[];
  categoriesTotal: number;
  xpPerLevel: number;
};

const containerStyle: CSSProperties = { display: 'flex', height: '100%', minHeight: 0 };
const sidebarStyle: CSSProperties = {
  width: 280,
  padding: '18px 16px',
  borderRight: '1px solid #d0d7e6',
  background: '#f1f5f9',
  overflowY: 'auto',
};
const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 };
const mainStyle: CSSProperties = { flex: 1, minWidth: 0, overflowY: 'auto', padding: 24 };
const panelStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 18,
  border: '1px solid #d0d7e6',
  padding: 20,
  display: 'grid',
  gap: 16,
  boxShadow: '0 12px 32px rgba(15,23,42,0.05)',
};

export default function ClassOverviewScreen() {
  const { state } = useApp();
  const students = useMemo(() => {
    const sorted = [...state.students];
    sorted.sort((a, b) => a.alias.localeCompare(b.alias, 'de'));
    return sorted;
  }, [state.students]);
  const [selectedId, setSelectedId] = useState<string | null>(() => students[0]?.id ?? null);

  useEffect(() => {
    if (students.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((previous) => {
      if (previous && students.some((student) => student.id === previous)) {
        return previous;
      }
      return students[0]?.id ?? null;
    });
  }, [students]);

  const selectedStudent = useMemo(
    () => selectStudentById({ students: state.students }, selectedId),
    [state.students, selectedId],
  );
  const logs = useMemo(
    () => selectLogsForStudent({ logs: state.logs }, selectedId, 12),
    [state.logs, selectedId],
  );
  const categories = useMemo(() => {
    if (!selectedStudent) {
      return [] as CategoryEntry[];
    }
    const totals = selectStudentCategoryXp(state, selectedStudent);
    const entries = Object.entries(totals).map(([name, xp]) => ({ name, xp }));
    entries.sort((a, b) => b.xp - a.xp);
    return entries;
  }, [state, selectedStudent]);
  const categoriesTotal = useMemo(
    () => categories.reduce((sum, entry) => sum + entry.xp, 0),
    [categories],
  );
  const xpPerLevel = Math.max(1, state.settings.xpPerLevel || 1);

  return (
    <div style={containerStyle}>
      <aside style={sidebarStyle}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Klassenübersicht</h2>
        {students.length === 0 ? (
          <p style={{ margin: 0, color: '#475569' }}>Noch keine Schüler angelegt.</p>
        ) : (
          <ul style={listStyle}>
            {students.map((student) => {
              const selected = student.id === selectedId;
              return (
                <li key={student.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedId(student.id)}
                    style={{
                      width: '100%',
                      borderRadius: 14,
                      border: '1px solid #cbd5f5',
                      padding: '10px 12px',
                      background: selected ? '#dbeafe' : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      boxShadow: selected ? '0 6px 18px rgba(37, 99, 235, 0.18)' : 'none',
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
                      size={48}
                      rounded="xl"
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{student.alias}</div>
                      <div style={{ fontSize: 12, color: '#475569' }}>
                        {formatNumber(student.xp)} XP · Level {student.level}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
      <main style={mainStyle}>
        {!selectedStudent ? (
          <p style={{ margin: 0, color: '#475569' }}>Wähle links einen Schüler, um Details zu sehen.</p>
        ) : (
          <ProfilePane
            student={selectedStudent}
            teamName={
              selectedStudent.teamId
                ? state.teams.find((team) => team.id === selectedStudent.teamId)?.name ?? null
                : null
            }
            logs={logs}
            categories={categories}
            categoriesTotal={categoriesTotal}
            xpPerLevel={xpPerLevel}
          />
        )}
      </main>
    </div>
  );
}

function ProfilePane({ student, teamName, logs, categories, categoriesTotal, xpPerLevel }: ProfilePaneProps) {
  const badges = student.badges ?? [];
  const progress = computeLevelProgress(student, xpPerLevel);

  return (
    <div style={{ display: 'grid', gap: 24, paddingBottom: 24 }}>
      <section style={{ ...panelStyle, paddingBottom: 24 }}>
        <header style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <AvatarView
            student={{
              alias: student.alias,
              avatarMode: student.avatarMode,
              avatarPack: student.avatarPack,
              level: student.level,
              xp: student.xp,
            }}
            size={108}
            rounded="xl"
          />
          <div style={{ minWidth: 0, display: 'grid', gap: 6 }}>
            <h1 style={{ margin: 0, fontSize: 26 }}>{student.alias}</h1>
            <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
              {formatNumber(student.xp)} XP · Level {student.level}
              {teamName ? ` · ${teamName}` : ''}
            </p>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 13, color: '#475569' }}>
                {formatNumber(progress.inLevel)} / {formatNumber(progress.xpPerLevel)} XP in diesem Level
              </div>
              <div
                aria-hidden
                style={{
                  marginTop: 6,
                  height: 10,
                  borderRadius: 999,
                  background: '#e2e8f0',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.round(progress.ratio * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #34d399, #22d3ee)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                {formatNumber(progress.remaining)} XP bis Level {progress.nextLevel}
              </div>
            </div>
          </div>
        </header>
      </section>

      <section style={panelStyle}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Badges</h2>
        {badges.length === 0 ? (
          <p style={{ margin: 0, color: '#475569' }}>Noch keine Badges vergeben.</p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {badges.map((badge) => (
              <li
                key={`${badge.id}-${badge.awardedAt}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderRadius: 999,
                  border: '1px solid #cbd5f5',
                  padding: '6px 12px',
                  background: '#f8fafc',
                }}
              >
                <BadgeIcon name={badge.name} iconKey={badge.iconKey} size={42} />
                <span style={{ fontSize: 14 }}>{badge.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={panelStyle}>
        <h2 style={{ margin: 0, fontSize: 20 }}>XP nach Kategorie</h2>
        {categories.length === 0 ? (
          <p style={{ margin: 0, color: '#475569' }}>Keine Einträge vorhanden.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
            {categories.map((entry) => {
              const ratio = categoriesTotal > 0 ? entry.xp / categoriesTotal : 0;
              const label = entry.name === 'uncategorized' ? 'Sonstiges' : entry.name;
              return (
                <li key={entry.name} style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span style={{ color: '#475569' }}>
                      {formatNumber(entry.xp)} XP · {Math.round(ratio * 100)}%
                    </span>
                  </div>
                  <div
                    aria-hidden
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: '#e2e8f0',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.round(ratio * 100)}%`,
                        height: '100%',
                        background: '#5b8def',
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section style={panelStyle}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Letzte Vergaben</h2>
        {logs.length === 0 ? (
          <p style={{ margin: 0, color: '#475569' }}>Noch keine Vergaben aufgezeichnet.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
            {logs.map((entry) => (
              <li
                key={entry.id}
                style={{
                  border: '1px solid #d0d7e6',
                  borderRadius: 14,
                  padding: 14,
                  background: '#f8fafc',
                  display: 'grid',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                  <strong style={{ fontSize: 15 }}>+{formatNumber(entry.xp)} XP</strong>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{formatTimestamp(entry.timestamp)}</span>
                </div>
                <div style={{ fontSize: 14 }}>{entry.questName}</div>
                {entry.note && <div style={{ fontSize: 12, color: '#475569' }}>{entry.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
