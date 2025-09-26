import { useApp } from '@/app/AppContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { state } = useApp();
  const animations = state.settings?.animationsEnabled ?? true;

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="wallpaper-underlay" aria-hidden />
      {animations && <div className="star-sky" aria-hidden />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
