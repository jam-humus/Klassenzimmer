import React from 'react';
import { useHotkeyLock } from './KeyScope';

type HelpOverlayProps = {
  open: boolean;
  onClose: () => void;
};

const SHORTCUTS: Array<{ combo: string; description: string }> = [
  { combo: '?', description: 'Hilfe anzeigen' },
  { combo: '⌘/Ctrl + K', description: 'Befehlspalette öffnen' },
  { combo: 'U oder ⌘/Ctrl + Z', description: 'Letzte Aktion rückgängig' },
  { combo: 'A', description: 'Alle Schüler auswählen (Vergeben)' },
  { combo: 'Esc', description: 'Auswahl leeren / Dialog schließen' },
  { combo: '1–5', description: 'Zwischen den Tabs wechseln' },
  { combo: 'Pfeiltasten', description: 'Schülerkacheln navigieren' },
  { combo: 'Enter', description: 'Aktive Quest vergeben' },
  { combo: '⌘/Ctrl + F', description: 'Filter im Leaderboard/Protokoll fokussieren' },
];

export default function HelpOverlay({ open, onClose }: HelpOverlayProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  useHotkeyLock(open);

  React.useEffect(() => {
    if (!open) return undefined;
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const button = containerRef.current?.querySelector<HTMLButtonElement>('button');
    button?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-hotkey-suspend="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        zIndex: 1100,
      }}
    >
      <div
        ref={containerRef}
        onClick={(event) => event.stopPropagation()}
        style={{
          background: '#fff',
          color: '#0f172a',
          borderRadius: 16,
          padding: 20,
          width: 'min(720px, 94vw)',
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.35)',
          display: 'grid',
          gap: 16,
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>Tastaturkürzel</h2>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Schneller arbeiten mit ClassQuest</span>
        </header>
        <div style={{ display: 'grid', gap: 8 }}>
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.combo}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 10px',
                borderRadius: 10,
                background: 'rgba(226, 232, 240, 0.6)',
              }}
            >
              <strong style={{ fontFamily: 'monospace', letterSpacing: 0.5 }}>{shortcut.combo}</strong>
              <span style={{ fontSize: 14 }}>{shortcut.description}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 14px', borderRadius: 10 }}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
