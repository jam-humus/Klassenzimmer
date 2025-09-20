import React from 'react';
import { useHotkeyLock } from '~/ui/shortcut/KeyScope';

type SeasonResetDialogProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function SeasonResetDialog({ open, onConfirm, onCancel }: SeasonResetDialogProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  useHotkeyLock(open);

  React.useEffect(() => {
    if (!open) return undefined;
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onCancel]);

  React.useEffect(() => {
    if (!open) return;
    const confirmButton = containerRef.current?.querySelector<HTMLButtonElement>('[data-accept]');
    confirmButton?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      data-hotkey-suspend="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        zIndex: 1200,
      }}
    >
      <div
        ref={containerRef}
        onClick={(event) => event.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          width: 'min(520px, 92vw)',
          display: 'grid',
          gap: 16,
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.35)',
        }}
      >
        <h2 style={{ margin: 0 }}>Neue Saison starten?</h2>
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Dadurch werden XP, Level, Streaks und das Protokoll aller Schüler zurückgesetzt. Schüler, Gruppen und Quests
          bleiben erhalten. Dies kann nicht rückgängig gemacht werden.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button type="button" onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 10 }}>
            Abbrechen
          </button>
          <button
            type="button"
            data-accept
            onClick={onConfirm}
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
            }}
          >
            Saison zurücksetzen
          </button>
        </div>
      </div>
    </div>
  );
}
