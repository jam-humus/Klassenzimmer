import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useApp } from '~/app/AppContext';
import { selectLogsForStudent, selectStudentById } from '~/core/selectors/student';
import { selectStudentCategoryXp } from '~/core/selectors/badges';
import type { LogEntry, Student } from '~/types/models';
import { AvatarView } from '~/ui/avatar/AvatarView';
import StudentProfileCardV2 from '~/ui/components/student/StudentProfileCardV2';
import { getNextStudentId } from '~/ui/student/getNextStudentId';
import { shouldIgnoreNavigation } from '~/ui/utils/isTextInputLike';

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
  width: 292,
  padding: '24px 18px',
  borderRight: '1px solid rgba(148,163,184,0.35)',
  background: 'rgba(248,250,252,0.82)',
  backdropFilter: 'blur(12px)',
  boxShadow: 'inset -1px 0 0 rgba(15,23,42,0.08)',
  overflowY: 'auto',
};
const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 };
const mainStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflowY: 'auto',
  padding: '28px clamp(20px, 4vw, 36px)',
};
const detailsStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 24,
  border: '1px solid #d0d7e6',
  boxShadow: '0 18px 48px rgba(15,23,42,0.08)',
  overflow: 'hidden',
};
const summaryStyle: CSSProperties = {
  margin: 0,
  padding: '18px 24px',
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
  color: '#0f172a',
  listStyle: 'none',
};
const detailsContentStyle: CSSProperties = { padding: '0 24px 24px', display: 'grid', gap: 16 };

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }
      if (shouldIgnoreNavigation(event)) {
        return;
      }
      if (students.length === 0) {
        return;
      }
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 'forward' : 'backward';
      setSelectedId((current) => getNextStudentId(current, direction, students) ?? current);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
        <h2 style={{ margin: '0 0 16px', fontSize: 18, lineHeight: '1.6', color: '#0f172a' }}>
          Klassenübersicht
        </h2>
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
                      borderRadius: 18,
                      border: '1px solid rgba(148,163,184,0.35)',
                      padding: '12px 14px',
                      background: selected ? 'rgba(219,234,254,0.9)' : 'rgba(255,255,255,0.7)',
                      backdropFilter: 'blur(10px)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      boxShadow: selected
                        ? '0 12px 30px rgba(37,99,235,0.18)'
                        : '0 6px 16px rgba(15,23,42,0.06)',
                      transition: 'background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
                      transform: selected ? 'translateY(-1px)' : 'translateY(0)',
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
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2, color: '#0f172a' }}>
                        {student.alias}
                      </div>
                      <div style={{ fontSize: 12, color: 'rgba(71,85,105,0.9)' }}>
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
  return (
    <div style={{ display: 'grid', gap: 24, paddingBottom: 24 }}>
      <StudentProfileCardV2
        student={student}
        xpPerLevel={xpPerLevel}
        teamName={teamName}
        categories={categories}
        categoriesTotal={categoriesTotal}
      />

      <details open style={detailsStyle}>
        <summary style={summaryStyle}>XP nach Kategorie (voll)</summary>
        <div style={detailsContentStyle}>
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
        </div>
      </details>

      <details open style={detailsStyle}>
        <summary style={summaryStyle}>Letzte Vergaben</summary>
        <div style={detailsContentStyle}>
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
        </div>
      </details>
    </div>
  );
}
