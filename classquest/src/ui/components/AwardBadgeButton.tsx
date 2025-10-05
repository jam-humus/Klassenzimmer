import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useApp } from '~/app/AppContext';
import { BadgeIcon } from '~/ui/components/BadgeIcon';
import type { Student } from '~/types/models';

type AwardBadgeButtonProps = {
  student: Student;
};

const buttonStyle: CSSProperties = {
  borderRadius: 999,
  border: '1.5px solid var(--accent)',
  background: 'color-mix(in oklab, var(--accent), transparent 92%)',
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--accent)',
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
  transition: 'background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
};

const buttonHoverStyle: CSSProperties = {
  background: 'color-mix(in oklab, var(--accent), transparent 86%)',
  boxShadow: '0 14px 32px rgba(15,23,42,0.14)',
  transform: 'translateY(-1px)',
};

const popoverStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  right: 0,
  marginTop: 8,
  width: 280,
  maxHeight: 300,
  overflowY: 'auto',
  borderRadius: 16,
  border: '1px solid #d0d7e6',
  background: '#fff',
  boxShadow: '0 24px 48px rgba(15,23,42,0.18)',
  zIndex: 20,
};

const optionButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  padding: '10px 12px',
  borderRadius: 12,
  border: '1px solid transparent',
  background: '#f8fafc',
  cursor: 'pointer',
  textAlign: 'left',
};

const optionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: '#0f172a',
};

const optionDescriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: '#475569',
};

export default function AwardBadgeButton({ student }: AwardBadgeButtonProps) {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const badgeDefs = useMemo(() => {
    const list = [...(state.badgeDefs ?? [])];
    list.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return list;
  }, [state.badgeDefs]);

  const ownedIds = useMemo(() => new Set((student.badges ?? []).map((badge) => badge.id)), [student.badges]);

  const available = useMemo(() => badgeDefs.filter((definition) => !ownedIds.has(definition.id)), [badgeDefs, ownedIds]);

  useEffect(() => setOpen(false), [student.id]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        style={{ ...buttonStyle, ...(hovered ? buttonHoverStyle : undefined) }}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        🏅 Badge vergeben
      </button>
      {open && (
        <div style={popoverStyle}>
          {available.length === 0 ? (
            <p style={{ margin: 0, padding: '16px 18px', fontSize: 13, color: '#475569' }}>
              Keine weiteren Badges verfügbar.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 8, display: 'grid', gap: 8 }} role="listbox">
              {available.map((definition) => (
                <li key={definition.id}>
                  <button
                    type="button"
                    style={optionButtonStyle}
                    onClick={() => {
                      dispatch({ type: 'AWARD_BADGE_MANUAL', studentId: student.id, badgeId: definition.id });
                      setOpen(false);
                    }}
                  >
                    <BadgeIcon name={definition.name} iconKey={definition.iconKey} size={40} />
                    <div style={{ minWidth: 0 }}>
                      <p style={optionTitleStyle}>{definition.name}</p>
                      {definition.description && (
                        <p style={optionDescriptionStyle}>{definition.description}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
