import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  accents,
  backgrounds,
  defaultAccent,
  defaultBackground,
  defaultTheme,
  themes,
} from '@/config/theme.config';

interface ThemeState {
  theme: (typeof themes)[number]['id'];
  accent: (typeof accents)[number]['id'];
  bg: (typeof backgrounds)[number]['id'];
}

type ThemeContextValue = ThemeState & {
  setTheme: (theme: ThemeState['theme']) => void;
  setAccent: (accent: ThemeState['accent']) => void;
  setBg: (bg: ThemeState['bg']) => void;
  themes: typeof themes;
  accents: typeof accents;
  bgs: typeof backgrounds;
  cycleAccent: () => void;
  isMounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'cq_theme';

const getInitialState = (): ThemeState => ({
  theme: defaultTheme,
  accent: defaultAccent,
  bg: defaultBackground,
});

const readStoredState = (): Partial<ThemeState> | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ThemeState>;
    return parsed;
  } catch (error) {
    console.warn('[ThemeProvider] Failed to parse stored theme state', error);
    return null;
  }
};

const applyStateToRoot = (state: ThemeState) => {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.setAttribute('data-theme', state.theme);
  root.setAttribute('data-accent', state.accent);
  root.setAttribute('data-bg', state.bg);
};

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<ThemeState>(getInitialState);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredState();
    if (stored) {
      setState((prev) => ({
        theme: stored.theme ?? prev.theme,
        accent: stored.accent ?? prev.accent,
        bg: stored.bg ?? prev.bg,
      }));
    }
    setIsMounted(true);
  }, []);

  useEffect(() => {
    applyStateToRoot(state);
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('[ThemeProvider] Failed to persist theme state', error);
    }
  }, [state]);

  const value = useMemo<ThemeContextValue>(() => {
    const setTheme = (theme: ThemeState['theme']) =>
      setState((prev) => ({ ...prev, theme }));
    const setAccent = (accent: ThemeState['accent']) =>
      setState((prev) => ({ ...prev, accent }));
    const setBg = (bg: ThemeState['bg']) => setState((prev) => ({ ...prev, bg }));
    const cycleAccent = () => {
      const index = accents.findIndex((accentDef) => accentDef.id === state.accent);
      const next = accents[(index + 1) % accents.length]?.id ?? accents[0]!.id;
      setState((prev) => ({ ...prev, accent: next }));
    };

    return {
      ...state,
      setTheme,
      setAccent,
      setBg,
      themes,
      accents,
      bgs: backgrounds,
      cycleAccent,
      isMounted,
    };
  }, [state, isMounted]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeContext = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};

export default ThemeProvider;
