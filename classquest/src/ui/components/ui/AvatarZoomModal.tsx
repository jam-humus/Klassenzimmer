import { useEffect, useId, useRef } from 'react';
import { AvatarView, type AvatarViewStudent } from '~/ui/avatar/AvatarView';

const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

type AvatarZoomModalProps = {
  open: boolean;
  student: AvatarViewStudent;
  onClose: () => void;
};

export function AvatarZoomModal({ open, student, onClose }: AvatarZoomModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const headingId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const closeButton = closeButtonRef.current;
    if (closeButton) {
      closeButton.focus({ preventScroll: true });
    }
    return () => {
      const previous = previousFocusRef.current;
      if (previous && typeof previous.focus === 'function') {
        previous.focus({ preventScroll: true });
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const getFocusableElements = () => {
    if (!dialogRef.current) {
      return [] as HTMLElement[];
    }
    return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => !element.hasAttribute('disabled'),
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (active === first || !active) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      }
      return;
    }

    if (active === last || !active) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div
      role="presentation"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 60,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          background: 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.86))',
          borderRadius: 28,
          padding: 24,
          width: 'min(90vw, 520px)',
          boxShadow: '0 28px 80px rgba(15,23,42,0.45)',
          border: '1px solid rgba(148,163,184,0.3)',
          display: 'grid',
          gap: 16,
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h2 id={headingId} style={{ margin: 0, fontSize: 18, color: '#e2e8f0', fontWeight: 600 }}>
            Avatar von {student.alias}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            aria-label="Zoom schließen"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: '1px solid rgba(148,163,184,0.4)',
              background: 'rgba(30,41,59,0.6)',
              color: '#f8fafc',
              fontSize: 22,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </header>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <AvatarView
            student={student}
            size={360}
            rounded="xl"
            style={{
              width: 'min(80vw, 440px)',
              height: 'min(80vw, 440px)',
              borderRadius: 36,
              boxShadow: '0 24px 80px rgba(14,116,144,0.45)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default AvatarZoomModal;
