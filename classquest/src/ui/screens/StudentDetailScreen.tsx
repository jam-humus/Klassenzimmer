import { useEffect, useMemo, type CSSProperties } from 'react';
import { useApp } from '~/app/AppContext';
import { selectLogsForStudent, selectStudentById } from '~/core/selectors/student';
import { selectStudentCategoryXp } from '~/core/selectors/badges';
import StudentProfileCardV2 from '~/ui/components/student/StudentProfileCardV2';
import { getNextStudentId } from '~/ui/student/getNextStudentId';
import { shouldIgnoreNavigation } from '~/ui/utils/isTextInputLike';
import { navigateToAwardScreen } from '~/ui/student/navigate';

const detailsStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 24,
  border: '1px solid rgba(148,163,184,0.35)',
  boxShadow: '0 18px 48px rgba(15,23,42,0.15)',
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

const detailsContentStyle: CSSProperties = {
  padding: '0 24px 24px',
  display: 'grid',
  gap: 16,
};

type StudentDetailScreenProps = {
  studentId: string;
  onClose: () => void;
  onSelectStudent: (studentId: string) => void;
};

type CategoryEntry = {
  name: string;
  xp: number;
};

function formatTimestamp(timestamp: number) {
  try {
    return new Date(timestamp).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  } catch (error) {
    console.warn('Konnte Zeitstempel nicht formatieren', error);
    return new Date(timestamp).toLocaleString();
  }
}

export default function StudentDetailScreen({ studentId, onClose, onSelectStudent }: StudentDetailScreenProps) {
  const { state } = useApp();

  const student = useMemo(
    () => selectStudentById({ students: state.students }, studentId),
    [state.students, studentId],
  );

  const logs = useMemo(
    () => selectLogsForStudent({ logs: state.logs }, studentId, 50),
    [state.logs, studentId],
  );

  const categories = useMemo(() => {
    if (!student) {
      return [] as CategoryEntry[];
    }
    const totals = selectStudentCategoryXp(state, student);
    const entries = Object.entries(totals).map(([name, xp]) => ({ name, xp }));
    entries.sort((a, b) => b.xp - a.xp);
    return entries;
  }, [state, student]);

  const categoriesTotal = useMemo(
    () => categories.reduce((sum, entry) => sum + entry.xp, 0),
    [categories],
  );

  const xpPerLevel = Math.max(1, state.settings.xpPerLevel || 1);

  const teamName = useMemo(() => {
    if (!student?.teamId) {
      return null;
    }
    return state.teams.find((team) => team.id === student.teamId)?.name ?? null;
  }, [student?.teamId, state.teams]);

  const sortedStudents = useMemo(() => {
    const list = [...state.students];
    list.sort((a, b) => a.alias.localeCompare(b.alias, 'de'));
    return list;
  }, [state.students]);

  useEffect(() => {
    if (!student) {
      onClose();
    }
  }, [student, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }
      if (shouldIgnoreNavigation(event)) {
        return;
      }
      const direction = event.key === 'ArrowRight' ? 'forward' : 'backward';
      const nextId = getNextStudentId(studentId, direction, sortedStudents);
      if (nextId) {
        event.preventDefault();
        onSelectStudent(nextId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [studentId, sortedStudents, onClose, onSelectStudent]);

  if (!student) {
    return null;
  }

  const handleAwardQuest = () => {
    navigateToAwardScreen(student.id);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-detail-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 60,
      }}
    >
      <div
        role="document"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(920px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
          borderRadius: 32,
          padding: '18px 0 32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 24px 12px' }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Detailansicht schließen"
            style={{
              border: '1px solid rgba(148,163,184,0.4)',
              background: 'rgba(15,23,42,0.08)',
              color: '#0f172a',
              borderRadius: 999,
              width: 40,
              height: 40,
              fontSize: 22,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '0 24px', display: 'grid', gap: 24 }}>
          <h2
            id="student-detail-title"
            style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
          >
            {student.alias}
          </h2>
          <StudentProfileCardV2
            student={student}
            xpPerLevel={xpPerLevel}
            teamName={teamName}
            categories={categories}
            categoriesTotal={categoriesTotal}
            onAwardQuest={() => handleAwardQuest()}
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
                            {Math.round(ratio * 100)}% · {entry.xp.toLocaleString('de-DE')} XP
                          </span>
                        </div>
                        <div
                          aria-hidden
                          style={{ height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}
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
                        border: '1px solid rgba(148,163,184,0.45)',
                        borderRadius: 16,
                        padding: 16,
                        background: 'rgba(248,250,252,0.95)',
                        display: 'grid',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <strong style={{ fontSize: 15, color: '#0f172a' }}>+{entry.xp.toLocaleString('de-DE')} XP</strong>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{formatTimestamp(entry.timestamp)}</span>
                      </div>
                      <div style={{ fontSize: 14, color: '#0f172a' }}>{entry.questName}</div>
                      {entry.note && <div style={{ fontSize: 12, color: '#475569' }}>{entry.note}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
