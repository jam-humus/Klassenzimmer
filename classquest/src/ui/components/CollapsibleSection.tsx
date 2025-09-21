import React from 'react';

export type CollapsibleState = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

function readInitialState(storageKey: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return typeof parsed === 'boolean' ? parsed : fallback;
  } catch (error) {
    console.warn('Konnte Collapsible-State nicht lesen', error);
    return fallback;
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCollapsibleState(key: string, initial = true): CollapsibleState {
  const storageKey = React.useMemo(() => `ui:collapse:${key}`, [key]);
  const [open, setOpen] = React.useState<boolean>(() => readInitialState(storageKey, initial));

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(open));
    } catch (error) {
      console.warn('Konnte Collapsible-State nicht speichern', error);
    }
  }, [storageKey, open]);

  return React.useMemo(() => ({ open, setOpen }), [open]);
}

type CollapsibleSectionProps = {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  state?: CollapsibleState;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
};

export function CollapsibleSection({
  id,
  title,
  children,
  actions,
  defaultOpen = true,
  state,
  style,
  contentStyle,
}: CollapsibleSectionProps) {
  const fallbackState = useCollapsibleState(id, defaultOpen);
  const { open, setOpen } = state ?? fallbackState;
  const contentId = `${id}-content`;

  return (
    <section
      style={{
        background: '#fff',
        padding: 16,
        borderRadius: 16,
        ...style,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {actions}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={contentId}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #cbd5f5',
              background: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {open ? 'Zuklappen' : 'Aufklappen'}
          </button>
        </div>
      </div>
      <div
        id={contentId}
        hidden={!open}
        style={{
          marginTop: 12,
          display: open ? undefined : 'none',
          ...contentStyle,
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default CollapsibleSection;
