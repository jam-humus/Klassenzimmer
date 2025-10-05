import { useApp } from '@/app/AppContext';
import AppBackground from '@/components/chrome/AppBackground';
import { useTheme } from '@/theme/useTheme';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const animations = state.settings?.animationsEnabled ?? true;
  const { bg } = useTheme();
  const showLegacyWallpaper = bg === 'none';

  return (
    <div
      className="app-shell"
      style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', position: 'relative' }}
    >
      <AppBackground />
      {showLegacyWallpaper && <div className="wallpaper-underlay" aria-hidden />}
      {animations && showLegacyWallpaper && <div className="star-sky" aria-hidden />}
      <div style={{ position: 'relative', zIndex: 10 }}>{children}</div>
    </div>
  );
}
