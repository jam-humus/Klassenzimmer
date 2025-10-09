import { useMemo } from 'react';
import { useApp } from '~/app/AppContext';
import { selectClassProgressView } from '~/core/selectors/classProgress';
import { ClassProgressBar } from '~/ui/components/ClassProgressBar';
import '~/ui/screens/dashboard.css';

type DashboardScreenProps = {
  onAddXp: () => void;
  onOpenWeeklyShow: () => void;
};

const numberFormatter = new Intl.NumberFormat('de-DE');
const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function formatTimestamp(timestamp: number) {
  try {
    return timeFormatter.format(timestamp);
  } catch (error) {
    console.warn('Zeitstempel konnte nicht formatiert werden', error);
    return new Date(timestamp).toLocaleString();
  }
}

function SegmentedXpBar({ current, step }: { current: number; step: number }) {
  const progress = step > 0 ? Math.min(1, current / step) : 0;
  const percent = Math.round(progress * 100);
  return (
    <div className="dashboard-xpbar" aria-label="Fortschritt zum nächsten Stern">
      <div
        className="dashboard-xpbar__fill"
        style={{ width: `${percent}%` }}
        aria-hidden
      />
    </div>
  );
}

function StarRow({ stars }: { stars: number }) {
  const totalVisible = Math.max(5, Math.min(8, stars + 1));
  return (
    <div className="dashboard-stars" aria-label={`Gesammelte Sterne: ${stars}`}>
      {Array.from({ length: totalVisible }, (_, index) => {
        const earned = index < stars;
        return (
          <span
            key={index}
            className={`dashboard-star${earned ? ' dashboard-star--earned' : ''}`}
            aria-hidden
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

export default function DashboardScreen({ onAddXp, onOpenWeeklyShow }: DashboardScreenProps) {
  const { state } = useApp();
  const classProgress = selectClassProgressView(state);
  const aliasById = useMemo(
    () => new Map(state.students.map((student) => [student.id, student.alias])),
    [state.students],
  );
  const recentLogs = useMemo(() => state.logs.slice(0, 6), [state.logs]);
  const topStudents = useMemo(() => {
    const sorted = [...state.students];
    sorted.sort((a, b) => b.xp - a.xp);
    return sorted.slice(0, 6);
  }, [state.students]);

  const remaining = numberFormatter.format(Math.max(0, classProgress.remaining));
  const step = numberFormatter.format(classProgress.step);
  const segmentTotal = numberFormatter.format(classProgress.current);

  return (
    <div className="dashboard">
      <section className="dashboard-card dashboard-card--highlight" aria-label="Klassenstatus">
        <div className="dashboard-card__header">
          <div>
            <p className="dashboard-card__eyebrow">Aktuelles Ziel</p>
            <h1 className="dashboard-card__title">{state.settings.className || 'ClassQuest'}</h1>
            <p className="dashboard-card__subtitle">
              Noch {remaining} XP bis zum nächsten Stern · Schrittgröße {step} XP
            </p>
          </div>
          <div className="dashboard-card__count" aria-live="polite">
            <span className="dashboard-card__count-label">Sterne</span>
            <span className="dashboard-card__count-value">{numberFormatter.format(classProgress.stars)}</span>
          </div>
        </div>
        <div className="dashboard-card__actions">
          <button type="button" className="dashboard-button" onClick={onAddXp}>
            + XP vergeben
          </button>
          <button type="button" className="dashboard-button dashboard-button--ghost" onClick={onOpenWeeklyShow}>
            Weekly Show starten
          </button>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-card" aria-label="Klassenfortschritt">
          <header className="dashboard-section-head">
            <div>
              <h2>Fortschritt zum nächsten Stern</h2>
              <p>Segment-XP: {segmentTotal} / {step}</p>
            </div>
            <button type="button" className="dashboard-link" onClick={onAddXp}>
              XP hinzufügen
            </button>
          </header>
          <SegmentedXpBar current={classProgress.current} step={classProgress.step} />
          <StarRow stars={classProgress.stars} />
          <ClassProgressBar />
        </section>

        <section className="dashboard-card" aria-label="Neueste Aktivitäten">
          <header className="dashboard-section-head">
            <h2>Letzte Aktivitäten</h2>
          </header>
          {recentLogs.length === 0 ? (
            <p className="dashboard-empty">Noch keine Aktivitäten – vergebe XP, um loszulegen.</p>
          ) : (
            <ul className="dashboard-activity">
              {recentLogs.map((log) => {
                const alias = aliasById.get(log.studentId) ?? 'Unbekannt';
                return (
                  <li key={log.id} className="dashboard-activity__item">
                    <div className="dashboard-activity__meta">
                      <span className="dashboard-activity__time">{formatTimestamp(log.timestamp)}</span>
                      <span className="dashboard-activity__xp">+{numberFormatter.format(log.xp)} XP</span>
                    </div>
                    <p className="dashboard-activity__title">{alias}</p>
                    <p className="dashboard-activity__detail">{log.questName}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="dashboard-card" aria-label="Highlights der Schüler:innen">
        <header className="dashboard-section-head">
          <h2>Top Schüler:innen</h2>
          <p>Highlights aus der Woche – keine Rangliste, nur Motivation.</p>
        </header>
        {topStudents.length === 0 ? (
          <p className="dashboard-empty">Füge Schüler:innen hinzu, um Highlights zu sehen.</p>
        ) : (
          <ul className="dashboard-top">
            {topStudents.map((student) => (
              <li key={student.id} className="dashboard-top__item">
                <div className="dashboard-top__alias">{student.alias}</div>
                <div className="dashboard-top__meta">
                  <span className="dashboard-top__xp">{numberFormatter.format(student.xp)} XP</span>
                  <span className="dashboard-top__level">Level {student.level}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
