import { useEffect } from 'react';
import { useApp } from '@/app/AppContext';
import { normalizeThemeId, type ThemeId } from '@/types/models';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { state } = useApp();

  useEffect(() => {
    const root = document.documentElement;
    const configured = normalizeThemeId(state.settings?.theme, 'space');

    if (typeof window === 'undefined') {
      root.setAttribute('data-theme', configured === 'system' ? 'space' : configured);
      return;
    }

    if (configured === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = () => {
        const next: ThemeId = media.matches ? 'dark' : 'light';
        root.setAttribute('data-theme', next);
      };
      apply();
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }

    root.setAttribute('data-theme', configured);
    return;
  }, [state.settings?.theme]);

  return <>{children}</>;
}
