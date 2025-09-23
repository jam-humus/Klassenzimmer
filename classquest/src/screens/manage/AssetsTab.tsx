import { useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { useFeedback } from '~/ui/feedback/FeedbackProvider';
import AssetUploadCard from '~/components/manage/AssetUploadCard';
import AssetPreviewList from '~/components/manage/AssetPreviewList';
import AssetBindingRow from '~/components/manage/AssetBindingRow';
import { blobStore } from '~/utils/blobStore';
import { playEventAudio, triggerEventLottie, preloadAssets } from '~/utils/effects';
import {
  type AssetEvent,
  type AssetKind,
  type AssetSettings,
  cloneAssetSettings,
  createDefaultAssetSettings,
} from '~/types/settings';
import {
  SNAPSHOT_AUDIO_EVENT_DETAILS,
  isSnapshotAssetEvent,
} from '~/core/show/snapshotEvents';

const AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/x-pn-wav',
]);

const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

const LOTTIE_TYPES = new Set(['application/json']);

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_LOTTIE_BYTES = 200 * 1024;

const fileMatches = (file: File, types: Set<string>, extensions: string[]): boolean => {
  if (file.type && types.has(file.type.toLowerCase())) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
};

const createAssetKey = () => `asset:${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;

const toPercent = (value: number | undefined) => Math.round((Math.max(0, Math.min(1, value ?? 1))) * 100);

const fromPercent = (value: number) => Math.max(0, Math.min(1, value / 100));

export default function AssetsTab() {
  const { state, dispatch } = useApp();
  const feedback = useFeedback();
  const assets = state.settings.assets ?? createDefaultAssetSettings();
  const [preloading, setPreloading] = useState(false);

  const updateAssets = (updater: (draft: AssetSettings) => void, message?: string) => {
    const draft = cloneAssetSettings(state.settings.assets ?? createDefaultAssetSettings());
    updater(draft);
    dispatch({ type: 'UPDATE_SETTINGS', updates: { assets: draft } });
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

  const lottieOptions = useMemo(
    () => libraryEntries.filter(({ ref }) => ref.type === 'lottie').map(({ id, ref }) => ({ id, name: ref.name })),
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

  const validateImage = (file: File) => {
    if (!fileMatches(file, IMAGE_TYPES, ['.png', '.jpg', '.jpeg', '.webp', '.svg'])) {
      return 'Ungültiger Dateityp. Bitte PNG, JPG, WEBP oder SVG verwenden.';
    }
    if (file.size > MAX_FILE_BYTES) {
      return 'Datei ist zu groß (max. 2 MB).';
    }
    return null;
  };

  const validateLottie = (file: File) => {
    if (!fileMatches(file, LOTTIE_TYPES, ['.json'])) {
      return 'Ungültiger Dateityp. Bitte Lottie-JSON verwenden.';
    }
    if (file.size > MAX_LOTTIE_BYTES) {
      return 'Animation ist sehr groß (empfohlen < 500 KB).';
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

  const handleBindingChange = (kind: 'audio' | 'lottie', event: AssetEvent, key: string | null) => {
    if (!isSnapshotAssetEvent(event)) {
      return;
    }
    updateAssets((draft) => {
      if (key) {
        draft.bindings[kind][event] = key;
      } else {
        delete draft.bindings[kind][event];
      }
    }, 'Verknüpfung gespeichert');
  };

  const handleTest = (event: AssetEvent) => {
    if (!isSnapshotAssetEvent(event)) {
      return;
    }
    playEventAudio(event);
    triggerEventLottie(event, { center: true });
  };

  const handlePreload = async () => {
    if (preloading) return;
    setPreloading(true);
    try {
      await preloadAssets();
      feedback.success('Assets vorgeladen');
    } catch (error) {
      console.error('Preload fehlgeschlagen', error);
      feedback.error('Preload fehlgeschlagen');
    } finally {
      setPreloading(false);
    }
  };

  const audioEnabled = assets.audio?.enabled ?? true;
  const animationEnabled = assets.animations?.enabled ?? true;
  const reducedMotion = assets.animations?.preferReducedMotion ?? false;
  const volumePercent = toPercent(assets.audio?.masterVolume);

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
          <AssetUploadCard
            title="Lottie-Animation hochladen"
            description="Animationsdatei im JSON-Format."
            accept=".json"
            hint="Bitte Lottie-JSON hochladen (optimiert, &lt;500 KB empfohlen)."
            validate={validateLottie}
            onUpload={(file) => handleUpload(file, 'lottie')}
          />
          <AssetUploadCard
            title="Grafik hochladen"
            description="Bilder für Avatare, Badges oder Klassenstars."
            accept=".png,.jpg,.jpeg,.webp,.svg"
            hint="Bitte PNG, JPG, WEBP oder SVG hochladen (max. 2 MB)."
            validate={validateImage}
            onUpload={(file) => handleUpload(file, 'image')}
          />
        </div>
      </section>

      <AssetPreviewList assets={libraryEntries} onRename={handleRename} onDelete={handleDelete} />

      <section style={{ display: 'grid', gap: 12 }} aria-label="Snapshot-Event-Zuordnungen">
        <div style={{ display: 'grid', gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Snapshot-Event-Mapping</h2>
          <p style={{ margin: 0, color: '#475569' }}>
            Verknüpfe hier die Sounds für die drei Phasen der Snapshot-Präsentation.
          </p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px' }}>Event</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Audio</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Animation</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Test</th>
              </tr>
            </thead>
            <tbody>
              {SNAPSHOT_AUDIO_EVENT_DETAILS.map(({ event, label, description }) => (
                <AssetBindingRow
                  key={event}
                  event={event}
                  label={label}
                  description={description}
                  audioOptions={audioOptions}
                  lottieOptions={lottieOptions}
                  audioValue={assets.bindings?.audio?.[event] ?? null}
                  lottieValue={assets.bindings?.lottie?.[event] ?? null}
                  onChange={handleBindingChange}
                  onTest={handleTest}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 16 }} aria-label="Globale Einstellungen">
        <h2 style={{ margin: 0, fontSize: 20 }}>Globale Einstellungen</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={audioEnabled}
              onChange={(event) =>
                updateAssets((draft) => {
                  draft.audio.enabled = event.target.checked;
                }, event.target.checked ? 'Audio aktiviert' : 'Audio deaktiviert')
              }
            />
            Audio aktiv
          </label>
          <label style={{ display: 'grid', gap: 6, maxWidth: 320 }}>
            <span>Master-Volume: {volumePercent}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volumePercent}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10) || 0;
                updateAssets((draft) => {
                  draft.audio.masterVolume = fromPercent(value);
                });
              }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={animationEnabled}
              onChange={(event) =>
                updateAssets((draft) => {
                  draft.animations.enabled = event.target.checked;
                }, event.target.checked ? 'Animationen aktiviert' : 'Animationen deaktiviert')
              }
            />
            Animationen aktiv
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(event) =>
                updateAssets((draft) => {
                  draft.animations.preferReducedMotion = event.target.checked;
                }, event.target.checked ? 'Reduzierte Bewegung bevorzugt' : 'Volle Bewegung bevorzugt')
              }
            />
            Reduzierte Bewegungen bevorzugen
          </label>
        </div>
        <div>
          <button
            type="button"
            onClick={handlePreload}
            disabled={preloading}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid #38bdf8',
              backgroundColor: preloading ? '#bae6fd' : '#e0f2fe',
              color: '#0f172a',
              fontWeight: 600,
              cursor: preloading ? 'progress' : 'pointer',
            }}
          >
            {preloading ? 'Lädt…' : 'Alle Assets preladen'}
          </button>
        </div>
      </section>
    </div>
  );
}
