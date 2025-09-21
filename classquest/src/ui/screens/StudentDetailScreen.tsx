import { useEffect } from 'react';
import type { LogEntry, Student } from '~/types/models';
import ProfileCard from '~/ui/components/ProfileCard';

type StudentDetailScreenProps = {
  student: Pick<Student, 'id' | 'alias' | 'xp' | 'level' | 'badges' | 'avatarMode' | 'avatarPack'>;
  logs: LogEntry[];
  onClose: () => void;
};

function formatTimestamp(timestamp: number) {
  try {
    return new Date(timestamp).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
  } catch (error) {
    console.warn('Konnte Zeitstempel nicht formatieren', error);
    return new Date(timestamp).toLocaleString();
  }
}

export default function StudentDetailScreen({ student, logs, onClose }: StudentDetailScreenProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-detail-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 50,
      }}
    >
      <div
        role="document"
        onClick={(event) => event.stopPropagation()}
        style={{
          background: 'transparent',
          borderRadius: 24,
          maxWidth: 560,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 8 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Detailansicht schließen"
            style={{
              border: 'none',
              background: 'rgba(15,23,42,0.06)',
              color: '#0f172a',
              borderRadius: 999,
              width: 36,
              height: 36,
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '0 24px 24px', display: 'grid', gap: 24 }}>
          <ProfileCard studentId={student.id} titleId="student-detail-title" />

          <section
            style={{
              background: '#fff',
              borderRadius: 24,
              border: '1px solid rgba(15,23,42,0.12)',
              boxShadow: '0 24px 48px rgba(15,23,42,0.08)',
              padding: 24,
              display: 'grid',
              gap: 16,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Letzte Vergaben</h3>
            {logs.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Noch keine Vergaben vorhanden.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
                {logs.map((entry) => (
                  <li
                    key={entry.id}
                    style={{
                      border: '1px solid rgba(15,23,42,0.1)',
                      borderRadius: 16,
                      padding: 14,
                      background: 'rgba(248,250,252,0.95)',
                      display: 'grid',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                      <strong style={{ fontSize: 15, color: '#0f172a' }}>+{entry.xp} XP</strong>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{formatTimestamp(entry.timestamp)}</span>
                    </div>
                    <div style={{ fontSize: 14, color: '#0f172a' }}>{entry.questName}</div>
                    {entry.note && (
                      <div style={{ fontSize: 12, color: '#475569' }}>{entry.note}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
