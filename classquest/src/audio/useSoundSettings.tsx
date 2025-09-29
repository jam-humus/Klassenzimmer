import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { PropsWithChildren, JSX } from 'react';
import { soundManager } from './SoundManager';
import { queueAppSound } from './soundQueue';
import type { SoundSettings } from './types';
import { eventBus } from '@/lib/EventBus';

const STORAGE_KEY = 'classquest:sound-settings';
const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.8,
};

const clampVolume = (value: number): number => {
  if (Number.isNaN(value)) {
    return DEFAULT_SETTINGS.volume;
  }

  return Math.min(1, Math.max(0, value));
};

type SoundSettingsContextValue = {
  settings: SoundSettings;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
};

const SoundSettingsContext = createContext<SoundSettingsContextValue | null>(null);

const loadSettings = (): SoundSettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_SETTINGS.enabled,
      volume: clampVolume(parsed.volume ?? DEFAULT_SETTINGS.volume),
    };
  } catch (error) {
    console.warn('[SoundSettings] Failed to load settings, using defaults', error);
    return DEFAULT_SETTINGS;
  }
};

const persistSettings = (settings: SoundSettings): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('[SoundSettings] Failed to persist settings', error);
  }
};

export function SoundSettingsProvider({ children }: PropsWithChildren): JSX.Element {
  const [settings, setSettings] = useState<SoundSettings>(() => loadSettings());

  useEffect(() => {
    soundManager.init();
  }, []);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  useEffect(() => {
    soundManager.setMuted(!settings.enabled);
    if (!settings.enabled) {
      soundManager.stop();
    }
  }, [settings.enabled]);

  useEffect(() => {
    soundManager.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    const offXp = eventBus.on('xp:granted', () => queueAppSound('xp_awarded'));
    const offLevel = eventBus.on('level:up', () => queueAppSound('level_up'));
    const offBadge = eventBus.on('badge:awarded', () => queueAppSound('badge_award'));

    return () => {
      offXp();
      offLevel();
      offBadge();
    };
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings((prev: SoundSettings) => ({ ...prev, enabled }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings((prev: SoundSettings) => ({ ...prev, volume: clampVolume(volume) }));
  }, []);

  const value = useMemo<SoundSettingsContextValue>(
    () => ({
      settings,
      setEnabled,
      setVolume,
    }),
    [setEnabled, setVolume, settings],
  );

  return <SoundSettingsContext.Provider value={value}>{children}</SoundSettingsContext.Provider>;
}

export function useSoundSettings(): SoundSettingsContextValue {
  const context = useContext(SoundSettingsContext);
  if (!context) {
    throw new Error('useSoundSettings must be used within a SoundSettingsProvider');
  }

  return context;
}
