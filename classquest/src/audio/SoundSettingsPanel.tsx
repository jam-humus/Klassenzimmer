import type { ChangeEvent } from 'react';
import { useCallback } from 'react';
import { soundManager } from './SoundManager';
import { SOUND_KEYS } from './sounds';
import { useSoundSettings } from './useSoundSettings';
import type { SoundKey } from './types';

const SOUND_LABELS: Record<SoundKey, string> = {
  'xp-grant': 'XP vergeben',
  'level-up': 'Level-Up',
  'badge-award': 'Badge vergeben',
  'slideshow-avatar': 'Slideshow Avatar',
  'slideshow-badge-flyin': 'Slideshow Badge-Fly-in',
};

export function SoundSettingsPanel(): JSX.Element {
  const { settings, setEnabled, setVolume } = useSoundSettings();

  const handleToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setEnabled(event.target.checked);
    },
    [setEnabled],
  );

  const handleVolumeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = parseFloat(event.target.value);
      setVolume(next);
    },
    [setVolume],
  );

  const handleTestSound = useCallback((key: SoundKey) => {
    soundManager.unlock();
    soundManager.play(key);
  }, []);

  const volumePercent = Math.round(settings.volume * 100);

  return (
    <section className="w-full max-w-xl space-y-6 rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-100 shadow-lg">
      <header className="space-y-1">
        <h2 className="text-xl font-semibold">Sound-Einstellungen</h2>
        <p className="text-sm text-slate-300">
          Passe Lautstärke und Soundeffekte für Auszeichnungen, Level-Ups und die Slideshow an.
        </p>
      </header>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-900 p-4 shadow-inner">
        <div className="space-y-1">
          <p className="text-base font-medium">Sound aktivieren</p>
          <p className="text-xs text-slate-300">Schaltet alle Soundeffekte global ein oder aus.</p>
        </div>
        <label className="relative inline-flex h-8 w-14 cursor-pointer items-center">
          <span className="sr-only">Sound aktivieren</span>
          <input
            aria-label="Sound aktivieren"
            checked={settings.enabled}
            className="peer sr-only"
            onChange={handleToggle}
            type="checkbox"
          />
          <span className="absolute inset-0 rounded-full bg-slate-700 transition peer-checked:bg-emerald-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-400" />
          <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition peer-checked:translate-x-6 peer-checked:bg-slate-950" />
        </label>
      </div>

      <div className="space-y-3 rounded-xl bg-slate-900 p-4 shadow-inner">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span className="font-medium text-slate-100">Lautstärke</span>
          <span>{volumePercent}%</span>
        </div>
        <input
          aria-label="Lautstärke"
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          max={1}
          min={0}
          onChange={handleVolumeChange}
          step={0.01}
          type="range"
          value={settings.volume}
        />
      </div>

      <div className="space-y-2 rounded-xl bg-slate-900 p-4 shadow-inner">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Test-Sounds</h3>
        <p className="text-xs text-slate-400">
          Hinweis: Falls kein Ton hörbar ist, klicke einmal auf „Audio entsperren“, um die Wiedergabe zu ermöglichen.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SOUND_KEYS.map((key) => (
            <button
              key={key}
              className="rounded-lg border border-emerald-500 bg-emerald-400 px-4 py-2 text-left text-sm font-semibold text-emerald-950 transition hover:border-emerald-300 hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
              onClick={() => handleTestSound(key)}
              type="button"
            >
              {SOUND_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200">
        <p className="mb-3 font-medium">Audio entsperren</p>
        <p className="text-xs text-slate-400">
          Browser blockieren Audio, bis eine Interaktion erfolgt. Klicke hier nach der ersten Nutzeraktion, um den Soundmanager
          zu entsperren.
        </p>
        <button
          className="mt-3 inline-flex items-center justify-center rounded-lg border border-slate-500 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-300 hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          onClick={() => soundManager.unlock()}
          type="button"
        >
          Audio entsperren
        </button>
      </div>
    </section>
  );
}

export default SoundSettingsPanel;
