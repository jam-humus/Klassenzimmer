import { useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { useFeedback } from '~/ui/feedback/FeedbackProvider';
import AssetUploadCard from '~/components/manage/AssetUploadCard';
import AssetPreviewList from '~/components/manage/AssetPreviewList';
import AssetBindingRow from '~/components/manage/AssetBindingRow';
import { blobStore } from '~/utils/blobStore';
import { playSound, preloadSounds } from '~/utils/sounds';
import {
  type AssetKind,
  type AssetSettings,
  cloneAssetSettings,
  cloneSoundSettings,
  createDefaultAssetSettings,
  createDefaultSoundSettings,
  type AppSoundEvent,
} from '~/types/settings';
import { SOUND_EVENT_DETAILS } from '~/core/show/snapshotEvents';

const AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/x-pn-wav',
]);

const MAX_FILE_BYTES = 2 * 1024 * 1024;

const fileMatches = (file: File, types: Set<string>, extensions: string[]): boolean => {
  if (file.type && types.has(file.type.toLowerCase())) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
};

const createAssetKey = () => `asset:${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

export default function AssetsTab() {
  const { state, dispatch } = useApp();
  const feedback = useFeedback();
  const assets = state.settings.assets ?? createDefaultAssetSettings();
  const soundSettings = state.settings.sounds ?? createDefaultSoundSettings();
  const [preloadingSounds, setPreloadingSounds] = useState(false);

  const updateAssets = (updater: (draft: AssetSettings) => void, message?: string) => {
    const draft = cloneAssetSettings(state.settings.assets ?? createDefaultAssetSettings());
    updater(draft);
    dispatch({ type: 'UPDATE_SETTINGS', updates: { assets: draft } });
    if (message) {
      feedback.success(message);
    }
  };

  const updateSoundSettings = (
    updater: (draft: typeof soundSettings) => void,
    message?: string,
  ) => {
    const draft = cloneSoundSettings(state.settings.sounds ?? createDefaultSoundSettings());
    updater(draft);
    dispatch({ type: 'UPDATE_SETTINGS', updates: { sounds: draft } });
    if (message) {
      feedback.success(message);
    }
  };

  const libraryEntries = useMemo(
    () =>
      Object.entries(assets.library ?? {})
        .map(([id, ref]) => ({ id, ref }))
        .sort((a, b) => b.ref.createdAt - a.ref.createdAt),
    [assets.library],
  );

  const audioOptions = useMemo(
    () => libraryEntries.filter(({ ref }) => ref.type === 'audio').map(({ id, ref }) => ({ id, name: ref.name })),
    [libraryEntries],
  );

  const validateAudio = (file: File) => {
    if (!fileMatches(file, AUDIO_TYPES, ['.mp3', '.ogg', '.wav'])) {
      return 'Ungültiger Dateityp. Bitte MP3, OGG oder WAV verwenden.';
    }
    if (file.size > MAX_FILE_BYTES) {
      return 'Datei ist zu groß (max. 2 MB).';
    }
    return null;
  };

  const handleUpload = async (file: File, type: AssetKind) => {
    const key = createAssetKey();
    try {
      const storedKey = await blobStore.put(key, file);
      const name = file.name?.trim() || `${type} Asset`;
      updateAssets((draft) => {
        draft.library[storedKey] = {
          key: storedKey,
          type,
          name,
          createdAt: Date.now(),
        };
      });
      feedback.success('Asset gespeichert');
    } catch (error) {
      console.error('Upload fehlgeschlagen', error);
      throw error instanceof Error ? error : new Error('Asset konnte nicht gespeichert werden.');
    }
  };

  const handleRename = async (id: string, name: string) => {
    updateAssets((draft) => {
      const target = draft.library[id];
      if (!target) return;
      target.name = name.trim() || target.name;
    }, 'Name aktualisiert');
  };

  const handleDelete = async (id: string) => {
    const entry = assets.library[id];
    updateAssets((draft) => {
      delete draft.library[id];
      (['audio', 'lottie', 'image'] as const).forEach((kind) => {
        const bindingMap = draft.bindings[kind];
        Object.entries(bindingMap).forEach(([evt, value]) => {
          if (value === id) {
            delete bindingMap[evt as AssetEvent];
          }
        });
      });
    });
    if (entry?.key) {
      await blobStore.remove(entry.key);
    }
    feedback.success('Asset entfernt');
  };

  const handleBindingChange = (event: AppSoundEvent, key: string | null) => {
    updateSoundSettings((draft) => {
      if (key) {
        draft.bindings[event] = key;
      } else {
        delete draft.bindings[event];
      }
    }, 'Sound gespeichert');
  };

  const handleTest = (event: AppSoundEvent) => {
    void playSound(event);
  };

  const handlePreload = async () => {
    if (preloadingSounds) return;
    setPreloadingSounds(true);
    try {
      await preloadSounds();
      feedback.success('Sounds vorgeladen');
    } catch (error) {
      console.error('Sound-Preload fehlgeschlagen', error);
      feedback.error('Sound-Preload fehlgeschlagen');
    } finally {
      setPreloadingSounds(false);
    }
  };

  const masterVolumePercent = Math.round(
    Math.max(0, Math.min(1, soundSettings.masterVolume ?? 1)) * 100,
  );

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section style={{ display: 'grid', gap: 16 }} aria-label="Assets hochladen">
        <h2 style={{ margin: 0, fontSize: 20 }}>Upload</h2>
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          <AssetUploadCard
            title="Sound hochladen"
            description="Kurze Sounds für XP, Level, Badges und den Showcase."
            accept=".mp3,.ogg,.wav"
            hint="Bitte MP3, OGG oder WAV hochladen (kurze Sounds &lt; 1s empfohlen)."
            validate={validateAudio}
            onUpload={(file) => handleUpload(file, 'audio')}
          />
        </div>
      </section>

      <AssetPreviewList assets={libraryEntries} onRename={handleRename} onDelete={handleDelete} />

      <section style={{ display: 'grid', gap: 16 }} aria-label="Sound-Einstellungen">
        <div style={{ display: 'grid', gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Sound-Effekte</h2>
          <p style={{ margin: 0, color: '#475569' }}>
            Weise für die unterstützten Events passende Audiodateien zu. Wenn kein Sound hinterlegt ist,
            bleibt das Event stumm.
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={soundSettings.enabled}
            onChange={(event) =>
              updateSoundSettings(
                (draft) => {
                  draft.enabled = event.target.checked;
                },
                event.target.checked ? 'Sounds aktiviert' : 'Sounds deaktiviert',
              )
            }
          />
          Sound-Effekte aktiv
        </label>
        <label style={{ display: 'grid', gap: 6, maxWidth: 320 }}>
          <span>Gesamtlautstärke: {masterVolumePercent}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={masterVolumePercent}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10) || 0;
              updateSoundSettings((draft) => {
                draft.masterVolume = Math.max(0, Math.min(1, value / 100));
              });
            }}
          />
        </label>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px' }}>Event</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Audio</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Test</th>
              </tr>
            </thead>
            <tbody>
              {SOUND_EVENT_DETAILS.map(({ event, label, description }) => (
                <AssetBindingRow
                  key={event}
                  event={event}
                  label={label}
                  description={description}
                  audioOptions={audioOptions}
                  audioValue={soundSettings.bindings?.[event] ?? null}
                  onChange={handleBindingChange}
                  onTest={handleTest}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <button
            type="button"
            onClick={handlePreload}
            disabled={preloadingSounds}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid #a855f7',
              backgroundColor: preloadingSounds ? '#ede9fe' : '#f3e8ff',
              color: '#4c1d95',
              fontWeight: 600,
              cursor: preloadingSounds ? 'progress' : 'pointer',
            }}
          >
            {preloadingSounds ? 'Lädt…' : 'Sounds vorladen'}
          </button>
        </div>
      </section>

    </div>
  );
}
