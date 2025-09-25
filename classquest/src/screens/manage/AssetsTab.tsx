import { useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { useFeedback } from '~/ui/feedback/FeedbackProvider';
import AssetUploadCard from '~/components/manage/AssetUploadCard';
import AssetPreviewList from '~/components/manage/AssetPreviewList';
import AssetBindingRow from '~/components/manage/AssetBindingRow';
import { blobStore } from '~/utils/blobStore';
import { playSnapshotSound, preloadSounds } from '~/utils/sounds';
import {
  type AssetKind,
  type AssetSettings,
  cloneAssetSettings,
  cloneSnapshotSoundSettings,
  createDefaultAssetSettings,
  createDefaultSnapshotSoundSettings,
  type SnapshotSoundEvent,
} from '~/types/settings';
import { SNAPSHOT_SOUND_EVENT_DETAILS } from '~/core/show/snapshotEvents';

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
  const snapshotSounds =
    state.settings.snapshotSounds ?? createDefaultSnapshotSoundSettings();
  const [preloadingSnapshotSounds, setPreloadingSnapshotSounds] = useState(false);

  const updateAssets = (updater: (draft: AssetSettings) => void, message?: string) => {
    const draft = cloneAssetSettings(state.settings.assets ?? createDefaultAssetSettings());
    updater(draft);
    dispatch({ type: 'UPDATE_SETTINGS', updates: { assets: draft } });
    if (message) {
      feedback.success(message);
    }
  };

  const updateSnapshotSounds = (
    updater: (draft: typeof snapshotSounds) => void,
    message?: string,
  ) => {
    const draft = cloneSnapshotSoundSettings(
      state.settings.snapshotSounds ?? createDefaultSnapshotSoundSettings(),
    );
    updater(draft);
    dispatch({ type: 'UPDATE_SETTINGS', updates: { snapshotSounds: draft } });
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

  const handleBindingChange = (event: SnapshotSoundEvent, key: string | null) => {
    updateSnapshotSounds((draft) => {
      if (key) {
        draft.bindings[event] = key;
      } else {
        delete draft.bindings[event];
      }
    }, 'Snapshot-Sound gespeichert');
  };

  const handleTest = (event: SnapshotSoundEvent) => {
    void playSnapshotSound(event);
  };

  const handleSnapshotPreload = async () => {
    if (preloadingSnapshotSounds) return;
    setPreloadingSnapshotSounds(true);
    try {
      await preloadSounds();
      feedback.success('Snapshot-Sounds vorgeladen');
    } catch (error) {
      console.error('Snapshot-Preload fehlgeschlagen', error);
      feedback.error('Snapshot-Preload fehlgeschlagen');
    } finally {
      setPreloadingSnapshotSounds(false);
    }
  };

  const snapshotVolumePercent = Math.round(
    Math.max(0, Math.min(1, snapshotSounds.volume ?? 1)) * 100,
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
            description="Kurze Snapshot-Sounds für XP, Level und Badges."
            accept=".mp3,.ogg,.wav"
            hint="Bitte MP3, OGG oder WAV hochladen (kurze Sounds &lt; 1s empfohlen)."
            validate={validateAudio}
            onUpload={(file) => handleUpload(file, 'audio')}
          />
        </div>
      </section>

      <AssetPreviewList assets={libraryEntries} onRename={handleRename} onDelete={handleDelete} />

      <section style={{ display: 'grid', gap: 16 }} aria-label="Snapshot-Sounds">
          <div style={{ display: 'grid', gap: 4 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Snapshot-Sounds</h2>
            <p style={{ margin: 0, color: '#475569' }}>
              Lege fest, welche Audioeffekte während der Snapshot-Show für XP, Level, Avatar und Badges
              abgespielt werden.
            </p>
          </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={snapshotSounds.enabled}
            onChange={(event) =>
              updateSnapshotSounds(
                (draft) => {
                  draft.enabled = event.target.checked;
                },
                event.target.checked ? 'Snapshot-Sounds aktiviert' : 'Snapshot-Sounds deaktiviert',
              )
            }
          />
          Snapshot-Sounds aktiv
        </label>
        <label style={{ display: 'grid', gap: 6, maxWidth: 320 }}>
          <span>Snapshot-Lautstärke: {snapshotVolumePercent}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={snapshotVolumePercent}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10) || 0;
              updateSnapshotSounds((draft) => {
                draft.volume = Math.max(0, Math.min(1, value / 100));
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
              {SNAPSHOT_SOUND_EVENT_DETAILS.map(({ event, label, description }) => (
                <AssetBindingRow
                  key={event}
                  event={event}
                  label={label}
                  description={description}
                  audioOptions={audioOptions}
                  audioValue={snapshotSounds.bindings?.[event] ?? null}
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
            onClick={handleSnapshotPreload}
            disabled={preloadingSnapshotSounds}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid #a855f7',
              backgroundColor: preloadingSnapshotSounds ? '#ede9fe' : '#f3e8ff',
              color: '#4c1d95',
              fontWeight: 600,
              cursor: preloadingSnapshotSounds ? 'progress' : 'pointer',
            }}
          >
            {preloadingSnapshotSounds ? 'Lädt…' : 'Snapshot-Sounds vorladen'}
          </button>
        </div>
      </section>

    </div>
  );
}
