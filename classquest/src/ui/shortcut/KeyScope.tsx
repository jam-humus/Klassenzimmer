import React from 'react';
import { useApp } from '~/app/AppContext';
import { shouldIgnoreHotkey } from './guards';

type Handler = (event: KeyboardEvent) => void;

type KeyScopeValue = {
  register: (handler: Handler) => () => void;
  suspend: () => () => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const KeyScopeContext = React.createContext<KeyScopeValue | null>(null);

export function KeyScopeProvider({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const handlersRef = React.useRef(new Set<Handler>());
  const suspendCountRef = React.useRef(0);

  React.useEffect(() => {
    if (state.settings.shortcutsEnabled === false) {
      return;
    }

    const handle = (event: KeyboardEvent) => {
      if (suspendCountRef.current > 0) {
        return;
      }
      if (shouldIgnoreHotkey(event)) {
        return;
      }
      handlersRef.current.forEach((handler) => handler(event));
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [state.settings.shortcutsEnabled]);

  const register = React.useCallback((handler: Handler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const suspend = React.useCallback(() => {
    suspendCountRef.current += 1;
    return () => {
      suspendCountRef.current = Math.max(0, suspendCountRef.current - 1);
    };
  }, []);

  const value = React.useMemo<KeyScopeValue>(() => ({ register, suspend }), [register, suspend]);

  return <KeyScopeContext.Provider value={value}>{children}</KeyScopeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKeydown(handler: Handler) {
  const context = React.useContext(KeyScopeContext);
  React.useEffect(() => {
    if (!context) return;
    return context.register(handler);
  }, [context, handler]);
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHotkeyLock(active: boolean) {
  const context = React.useContext(KeyScopeContext);
  React.useEffect(() => {
    if (!context || !active) {
      return undefined;
    }
    return context.suspend();
  }, [context, active]);
}
