import { useMemo } from 'react';
import { useApp } from '~/app/AppContext';
import { useFeedback } from '~/ui/feedback/FeedbackProvider';
import AssetPreviewList from '~/components/manage/AssetPreviewList';
import { blobStore } from '~/utils/blobStore';
import {
  type AssetSettings,
  type AssetEvent,
  cloneAssetSettings,
  createDefaultAssetSettings,
} from '~/types/settings';

export default function AssetsTab() {
  const { state, dispatch } = useApp();
  const feedback = useFeedback();
  const assets = state.settings.assets ?? createDefaultAssetSettings();

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
      (['lottie', 'image'] as const).forEach((kind) => {
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

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <AssetPreviewList assets={libraryEntries} onRename={handleRename} onDelete={handleDelete} />
    </div>
  );
}
