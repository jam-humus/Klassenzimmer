import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';

type Toast = { id: string; kind: 'success'|'info'|'error'; message: string; t: number };
type Ctx = {
  success: (msg: string) => void;
  info: (msg: string) => void;
  error: (msg: string) => void;
  play: (kind:'success'|'error') => void;
};
const FeedbackCtx = createContext<Ctx | null>(null);

const makeId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
const makeToast = (kind: Toast['kind'], message: string): Toast => ({ id: makeId(), kind, message, t: Date.now() });

function useSfx(enabled: boolean) {
  const play = useCallback(
    (_kind: 'success' | 'error') => {
      if (!enabled) return;
      // Sound effects are currently disabled.
    },
    [enabled],
  );
  return play;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sfx = useSfx(Boolean(state.settings?.sfxEnabled));
  const success = useCallback((message: string) => {
    setToasts((t) => [makeToast('success', message), ...t].slice(0, 5));
    sfx('success');
  }, [sfx]);
  const info = useCallback((message: string) => {
    setToasts((t) => [makeToast('info', message), ...t].slice(0, 5));
  }, []);
  const error = useCallback((message: string) => {
    setToasts((t) => [makeToast('error', message), ...t].slice(0, 5));
    sfx('error');
  }, [sfx]);

  useEffect(() => {
    const i = setInterval(() => {
      const cutoff = Date.now() - 4000;
      setToasts((ts) => ts.filter((x) => x.t > cutoff));
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const value = useMemo<Ctx>(() => ({ success, info, error, play: sfx }), [success, info, error, sfx]);
  return (
    <FeedbackCtx.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" style={{ position:'fixed', right:12, bottom:12, display:'grid', gap:8, zIndex:1000 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            style={{
              background: t.kind === 'error' ? '#fee2e2' : t.kind === 'success' ? '#dcfce7' : '#e2e8f0',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderLeft: `6px solid ${t.kind === 'error' ? '#ef4444' : t.kind === 'success' ? '#22c55e' : '#64748b'}`,
              padding: '8px 12px',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,.08)',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </FeedbackCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFeedback() {
  const ctx = useContext(FeedbackCtx);
  if (!ctx) throw new Error('FeedbackProvider missing');
  return ctx;
}
