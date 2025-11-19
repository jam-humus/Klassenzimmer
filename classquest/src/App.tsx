import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clock3,
  HelpCircle,
  Info,
  LayoutDashboard,
  PlaySquare,
  Search,
  Settings,
  Sparkles,
  Target,
  Users2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ThemeProvider from '@/theme/ThemeProvider';
import AppShell from '@/components/layout/AppShell';
import '@/styles/globals.css';
import '@/styles/starfield.css';
import './App.css';
import { useApp } from '~/app/AppContext';
import { useFeedback } from '~/ui/feedback/FeedbackProvider';
import FirstRunWizard from '~/ui/screens/FirstRunWizard';
import AwardScreen from '~/ui/screens/AwardScreen';
import LeaderboardScreen from '~/ui/screens/LeaderboardScreen';
import ClassOverviewScreen from '~/ui/screens/ClassOverviewScreen';
import LogScreen from '~/ui/screens/LogScreen';
import ManageScreen from '~/ui/screens/ManageScreen';
import InfoScreen from '~/ui/screens/InfoScreen';
import DashboardScreen from '~/ui/screens/DashboardScreen';
import CommandPalette from '~/ui/shortcut/CommandPalette';
import HelpOverlay from '~/ui/shortcut/HelpOverlay';
import { useKeydown } from '~/ui/shortcut/KeyScope';
import SeasonResetDialog from '~/ui/dialogs/SeasonResetDialog';
import {
  EVENT_CLEAR_SELECTION,
  EVENT_NAVIGATE_TAB,
  EVENT_SELECT_ALL,
  EVENT_UNDO_PERFORMED,
} from '~/ui/shortcut/events';
import ThemeToggle from '@/components/ui/ThemeToggle';
import AccentSelect from '@/components/ui/AccentSelect';
import { KEYBOARD_TAB_ORDER, type AppTab } from '~/types/navigation';
import { selectClassProgressView } from '~/core/selectors/classProgress';

type NavItem = {
  id: AppTab;
  label: string;
  aria: string;
  icon: LucideIcon;
};

const numberFormatter = new Intl.NumberFormat('de-DE');

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', aria: 'Dashboard anzeigen', icon: LayoutDashboard },
  { id: 'students', label: 'Schüler:innen', aria: 'Schülerübersicht öffnen', icon: Users2 },
  { id: 'rewards', label: 'Belohnungen', aria: 'Belohnungen vergeben', icon: Sparkles },
  { id: 'goals', label: 'Klassenziele', aria: 'Klassenziele anzeigen', icon: Target },
  { id: 'manage', label: 'Verwalten', aria: 'Einstellungen und Verwaltung öffnen', icon: Settings },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { id: 'log', label: 'Protokoll', aria: 'Aktivitätenprotokoll anzeigen', icon: Clock3 },
  { id: 'info', label: 'Info & Hilfe', aria: 'Info und Hilfe anzeigen', icon: Info },
];

export default function App() {
  const { state, dispatch } = useApp();
  const feedback = useFeedback();
  const [tab, setTab] = useState<AppTab>('dashboard');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const hasManagedData = useMemo(
    () => state.students.length > 0 || state.quests.length > 0 || state.logs.length > 0,
    [state.students, state.quests, state.logs],
  );

  const classProgress = useMemo(() => selectClassProgressView(state), [state]);
  const totalStudents = state.students.length;
  const totalQuests = state.quests.length;
  const totalXp = useMemo(
    () => state.students.reduce((sum, student) => sum + student.xp, 0),
    [state.students],
  );
  const activeStudents = useMemo(
    () => state.students.filter((student) => student.xp > 0).length,
    [state.students],
  );
  const xpToday = useMemo(() => {
    if (state.logs.length === 0) {
      return 0;
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return state.logs
      .filter((log) => log.timestamp >= startOfDay.getTime())
      .reduce((sum, log) => sum + log.xp, 0);
  }, [state.logs]);
  const nextStarPercent = useMemo(() => {
    const { current, step } = classProgress;
    if (!step) {
      return 0;
    }
    return Math.min(100, Math.round((current / step) * 100));
  }, [classProgress]);
  const sidebarStats = useMemo(
    () => [
      { label: 'Schüler:innen', value: numberFormatter.format(totalStudents) },
      { label: 'Quests', value: numberFormatter.format(totalQuests) },
      { label: 'XP gesamt', value: numberFormatter.format(totalXp) },
    ],
    [totalQuests, totalStudents, totalXp],
  );

  useEffect(() => {
    if (!state.settings.onboardingCompleted && hasManagedData) {
      dispatch({ type: 'UPDATE_SETTINGS', updates: { onboardingCompleted: true } });
    }
  }, [dispatch, hasManagedData, state.settings.onboardingCompleted]);

  const shouldShowFirstRun = !state.settings.onboardingCompleted && !hasManagedData;

  useEffect(() => {
    if (shouldShowFirstRun) {
      setTab('dashboard');
    }
  }, [shouldShowFirstRun]);

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: AppTab }>).detail;
      if (!detail?.tab) {
        return;
      }
      setTab(detail.tab);
    };
    window.addEventListener(EVENT_NAVIGATE_TAB, handleNavigate as EventListener);
    return () => window.removeEventListener(EVENT_NAVIGATE_TAB, handleNavigate as EventListener);
  }, []);

  const closeOverlays = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen(false);
    setResetOpen(false);
  }, []);

  useKeydown(
    useCallback(
      (event: KeyboardEvent) => {
        const key = event.key;
        const lower = key.toLowerCase();
        const mod = event.metaKey || event.ctrlKey;

        if (paletteOpen || helpOpen || resetOpen) {
          if (key === 'Escape') {
            event.preventDefault();
            closeOverlays();
          }
          return;
        }

        if (mod && lower === 'k') {
          event.preventDefault();
          setPaletteOpen(true);
          return;
        }

        if (!mod && (key === '?' || (key === '/' && event.shiftKey))) {
          event.preventDefault();
          setHelpOpen(true);
          return;
        }

        if ((mod && lower === 'z') || (!mod && lower === 'u')) {
          event.preventDefault();
          dispatch({ type: 'UNDO_LAST' });
          window.dispatchEvent(new Event(EVENT_UNDO_PERFORMED));
          return;
        }

        if (!mod && lower === 'a' && tab === 'rewards') {
          event.preventDefault();
          window.dispatchEvent(new Event(EVENT_SELECT_ALL));
          return;
        }

        if (!mod && key === 'Escape' && tab === 'rewards') {
          event.preventDefault();
          window.dispatchEvent(new Event(EVENT_CLEAR_SELECTION));
          return;
        }

        if (!mod && /^[1-6]$/.test(key)) {
          event.preventDefault();
          const index = Number(key) - 1;
          const next = KEYBOARD_TAB_ORDER[index];
          if (next) {
            setTab(next);
          }
        }
      },
      [paletteOpen, helpOpen, resetOpen, closeOverlays, dispatch, tab],
    ),
  );

  const handleSeasonReset = useCallback(() => {
    dispatch({ type: 'RESET_SEASON' });
    setResetOpen(false);
    feedback.success('Saison zurückgesetzt');
  }, [dispatch, feedback]);

  const openSeasonReset = useCallback(() => {
    setPaletteOpen(false);
    setHelpOpen(false);
    setResetOpen(true);
  }, []);

  const openWeeklyShow = useCallback(() => {
    const url = new URL(window.location.href);
    url.pathname = '/show';
    window.open(url.toString(), '_blank', 'noopener');
  }, []);

  const handleAddXpShortcut = useCallback(() => {
    setTab('rewards');
  }, []);

  return (
    <ThemeProvider>
      <AppShell>
        <div className="layout-root">
          <aside className="layout-sidebar" aria-label="Hauptnavigation">
            <div className="sidebar-brand">
              <span className="sidebar-brand__badge">CQ</span>
              <div className="sidebar-brand__meta">
                <span className="sidebar-brand__title">ClassQuest</span>
                <span className="sidebar-brand__subtitle">Klassenabenteuer</span>
              </div>
            </div>
            <nav className="sidebar-nav" aria-label="Hauptbereiche">
              {PRIMARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="sidebar-nav__item"
                    aria-current={tab === item.id ? 'page' : undefined}
                    aria-label={item.aria}
                    onClick={() => setTab(item.id)}
                  >
                    <Icon className="sidebar-nav__icon" size={20} aria-hidden />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <section className="sidebar-summary" aria-label="Live-Status der Klasse">
              <p className="sidebar-summary__eyebrow">Heute</p>
              <dl className="sidebar-summary__stats">
                {sidebarStats.map((stat) => (
                  <div key={stat.label} className="sidebar-summary__stat">
                    <dt>{stat.label}</dt>
                    <dd>{stat.value}</dd>
                  </div>
                ))}
              </dl>
              <div
                className="sidebar-progress"
                role="img"
                aria-label={`Fortschritt zum nächsten Stern: ${nextStarPercent}%`}
              >
                <div className="sidebar-progress__header">
                  <div>
                    <p className="sidebar-progress__label">Nächster Stern</p>
                    <p className="sidebar-progress__meta">
                      {numberFormatter.format(classProgress.current)} /
                      {' '}
                      {numberFormatter.format(classProgress.step || 0)} XP
                    </p>
                  </div>
                  <span className="sidebar-progress__percent">{nextStarPercent}%</span>
                </div>
                <div className="sidebar-progress__bar">
                  <div className="sidebar-progress__fill" style={{ width: `${nextStarPercent}%` }} />
                </div>
              </div>
            </section>
            <nav className="sidebar-nav sidebar-nav--secondary" aria-label="Weitere Bereiche">
              {SECONDARY_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="sidebar-nav__item sidebar-nav__item--secondary"
                    aria-current={tab === item.id ? 'page' : undefined}
                    aria-label={item.aria}
                    onClick={() => setTab(item.id)}
                  >
                    <Icon className="sidebar-nav__icon" size={20} aria-hidden />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="layout-main">
            <header className="layout-topbar">
              <button
                type="button"
                className="topbar-class"
                aria-label="Klasse wechseln"
                onClick={() => setTab('manage')}
              >
                <div className="topbar-class__name">{state.settings.className || 'ClassQuest'}</div>
                <div className="topbar-class__meta">Klassenübersicht</div>
              </button>
              <div className="topbar-insights" aria-live="polite">
                <div className="topbar-pill">
                  <span className="topbar-pill__label">Aktiv heute</span>
                  <span className="topbar-pill__value">{numberFormatter.format(xpToday)} XP</span>
                </div>
                <div className="topbar-pill">
                  <span className="topbar-pill__label">Aktive Schüler:innen</span>
                  <span className="topbar-pill__value">{numberFormatter.format(activeStudents)}</span>
                </div>
              </div>
              <div className="topbar-actions">
                <button
                  type="button"
                  className="topbar-button"
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Suchen oder Aktionen ausführen"
                >
                  <Search size={18} aria-hidden />
                  <span className="topbar-button__label">Suchen</span>
                  <kbd className="topbar-button__shortcut">⌘K</kbd>
                </button>
                <button
                  type="button"
                  className="topbar-button"
                  onClick={openWeeklyShow}
                >
                  <PlaySquare size={18} aria-hidden />
                  <span className="topbar-button__label">Weekly Show</span>
                </button>
                <div className="topbar-theme">
                  <ThemeToggle />
                  <AccentSelect />
                </div>
                <button type="button" className="icon-button" onClick={() => setHelpOpen(true)} aria-label="Hilfe anzeigen">
                  <HelpCircle size={18} aria-hidden />
                </button>
              </div>
            </header>

            <main className="layout-content" role="tabpanel">
              {shouldShowFirstRun ? (
                <FirstRunWizard
                  onDone={() => {
                    setTab('manage');
                  }}
                />
              ) : (
                <>
                  {tab === 'dashboard' && (
                    <DashboardScreen
                      onAddXp={handleAddXpShortcut}
                      onOpenWeeklyShow={openWeeklyShow}
                    />
                  )}
                  {tab === 'students' && <ClassOverviewScreen />}
                  {tab === 'rewards' && <AwardScreen />}
                  {tab === 'goals' && <LeaderboardScreen />}
                  {tab === 'log' && <LogScreen />}
                  {tab === 'manage' && <ManageScreen onOpenSeasonReset={openSeasonReset} />}
                  {tab === 'info' && <InfoScreen />}
                </>
              )}
            </main>
          </div>
        </div>

        <div className="toast-region" aria-live="polite" aria-atomic="true" id="toast-region" />

        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          setTab={setTab}
          onOpenSeasonReset={openSeasonReset}
        />
        <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
        <SeasonResetDialog open={resetOpen} onCancel={() => setResetOpen(false)} onConfirm={handleSeasonReset} />
      </AppShell>
    </ThemeProvider>
  );
}
