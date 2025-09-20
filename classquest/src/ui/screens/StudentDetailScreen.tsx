import { useEffect } from 'react';
import type { LogEntry, Student } from '~/types/models';
import { AvatarView } from '~/ui/avatar/AvatarView';

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
          background: '#fff',
          borderRadius: 20,
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(15,23,42,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 16 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Detailansicht schließen"
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '0 24px 24px', display: 'grid', gap: 24 }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <AvatarView
              student={{
                alias: student.alias,
                avatarMode: student.avatarMode,
                avatarPack: student.avatarPack,
                level: student.level,
                xp: student.xp,
              }}
              size={96}
              rounded="xl"
            />
            <div>
              <h2 id="student-detail-title" style={{ margin: 0, fontSize: 24 }}>{student.alias}</h2>
              <p style={{ margin: '4px 0 0', color: '#475569' }}>
                {student.xp} XP · Level {student.level}
              </p>
            </div>
          </header>

          {student.badges?.length ? (
            <section>
              <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Badges</h3>
              <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
                {student.badges.map((badge) => (
                  <li
                    key={badge.id}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: '1px solid #cbd5f5',
                      background: '#f8fafc',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 14,
                    }}
                  >
                    {badge.icon ? <span aria-hidden="true">{badge.icon}</span> : null}
                    <span>{badge.name}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Letzte Vergaben</h3>
            {logs.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b' }}>Noch keine Vergaben vorhanden.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
                {logs.map((entry) => (
                  <li
                    key={entry.id}
                    style={{
                      border: '1px solid #d0d7e6',
                      borderRadius: 12,
                      padding: 12,
                      background: '#f8fafc',
                      display: 'grid',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                      <strong style={{ fontSize: 16 }}>+{entry.xp} XP</strong>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{formatTimestamp(entry.timestamp)}</span>
                    </div>
                    <div style={{ fontSize: 14 }}>{entry.questName}</div>
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
