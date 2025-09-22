import { useEffect, useMemo, useRef, useState } from 'react';
import lottie, { type AnimationItem } from 'lottie-web';
import { blobStore } from '~/utils/blobStore';
import type { AssetRef } from '~/types/settings';

type AssetListEntry = {
  id: string;
  ref: AssetRef;
};

type AssetPreviewListProps = {
  assets: AssetListEntry[];
  onRename: (id: string, name: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

type AssetPreviewItemProps = {
  entry: AssetListEntry;
  onRename: (id: string, name: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

function useObjectUrl(key: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!key) {
      setUrl(null);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const objectUrl = await blobStore.getObjectUrl(key);
        if (!cancelled) {
          setUrl(objectUrl);
        }
      } catch (error) {
        console.warn('Konnte Asset-URL nicht laden', error);
        if (!cancelled) {
          setUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);
  return url;
}

function LottiePreview({ url, loop }: { url: string | null; loop: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!url || !container) {
      if (container) {
        container.innerHTML = '';
      }
      return;
    }

    let animation: AnimationItem | null = null;
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (cancelled) {
          return;
        }
        animation = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop,
          autoplay: true,
          animationData: data,
        });
      } catch (error) {
        console.warn('Lottie-Vorschau fehlgeschlagen', error);
      }
    })();

    return () => {
      cancelled = true;
      if (animation) {
        animation.destroy();
      }
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [loop, url]);

  return (
    <div
      ref={containerRef}
      aria-label="Lottie-Vorschau"
      style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    />
  );
}

function AssetPreviewItem({ entry, onRename, onDelete }: AssetPreviewItemProps) {
  const [name, setName] = useState(entry.ref.name);
  const [deleting, setDeleting] = useState(false);
  const [loop, setLoop] = useState(true);
  const url = useObjectUrl(entry.ref.key ?? entry.id);

  useEffect(() => {
    setName(entry.ref.name);
  }, [entry.ref.name]);

  const createdAt = useMemo(() => new Date(entry.ref.createdAt), [entry.ref.createdAt]);

  const commitRename = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(entry.ref.name);
      return;
    }
    if (trimmed === entry.ref.name) {
      return;
    }
    setName(trimmed);
    try {
      await onRename(entry.id, trimmed);
    } catch (error) {
      console.warn('Asset-Umbenennung fehlgeschlagen', error);
      setName(entry.ref.name);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    const confirmed = window.confirm(`Asset „${entry.ref.name}“ wirklich löschen?`);
    if (!confirmed) return;
    setDeleting(true);
    try {
      await onDelete(entry.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 12,
        display: 'grid',
        gap: 12,
        backgroundColor: '#f8fafc',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 12,
            backgroundColor: '#fff',
            border: '1px solid #cbd5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {entry.ref.type === 'audio' && url ? (
            <audio controls preload="metadata" src={url} style={{ width: '100%' }} aria-label="Audio-Vorschau" />
          ) : entry.ref.type === 'image' && url ? (
            <img
              src={url}
              alt={`Vorschau von ${entry.ref.name}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : entry.ref.type === 'lottie' ? (
            <LottiePreview url={url} loop={loop} />
          ) : (
            <span style={{ fontSize: 32 }}>📁</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 200, display: 'grid', gap: 8 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => {
                void commitRename();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void commitRename();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setName(entry.ref.name);
                }
              }}
              aria-label={`Asset ${entry.ref.name} umbenennen`}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5f5',
                fontSize: 14,
              }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 12,
                backgroundColor: '#e0e7ff',
                color: '#3730a3',
                fontWeight: 600,
              }}
            >
              {entry.ref.type.toUpperCase()}
            </span>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Hinzugefügt am {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}
            </span>
            {entry.ref.type === 'lottie' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={loop}
                  onChange={(event) => setLoop(event.target.checked)}
                />
                Loop
              </label>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ef4444',
              backgroundColor: deleting ? '#fee2e2' : '#fecaca',
              color: '#7f1d1d',
              fontWeight: 600,
              cursor: deleting ? 'progress' : 'pointer',
            }}
          >
            {deleting ? 'Löscht…' : 'Löschen'}
          </button>
        </div>
      </div>
    </li>
  );
}

export default function AssetPreviewList({ assets, onRename, onDelete }: AssetPreviewListProps) {
  const [query, setQuery] = useState('');

  const filteredAssets = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return assets;
    }
    return assets.filter(({ ref }) => ref.name.toLowerCase().includes(term));
  }, [assets, query]);

  return (
    <section style={{ display: 'grid', gap: 12 }} aria-label="Asset-Bibliothek">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Bibliothek</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>Suche</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nach Namen filtern…"
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #cbd5f5',
              minWidth: 200,
            }}
          />
        </label>
      </header>
      {filteredAssets.length === 0 ? (
        <p style={{ margin: 0, color: '#64748b' }}>Keine Assets gefunden.</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
          {filteredAssets.map((entry) => (
            <AssetPreviewItem key={entry.id} entry={entry} onRename={onRename} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}
