import React from 'react';
import { getObjectURL } from '~/services/blobStore';

type BadgeIconProps = {
  name: string;
  iconKey?: string | null;
  size?: number;
};

export function BadgeIcon({ name, iconKey, size = 48 }: BadgeIconProps) {
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!iconKey) {
      setUrl(null);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const objectUrl = await getObjectURL(iconKey);
        if (!cancelled) {
          setUrl(objectUrl ?? null);
        }
      } catch (error) {
        console.warn('Badge-Icon konnte nicht geladen werden', error);
        if (!cancelled) {
          setUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [iconKey]);

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.max(8, Math.round(size / 4)),
    border: '1px solid #d0d7e6',
    background: '#f8fafc',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  };

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        title={name}
        style={{ ...baseStyle, objectFit: 'cover' }}
      />
    );
  }

  return (
    <div style={baseStyle} role="img" aria-label={name} title={name}>
      <span aria-hidden style={{ fontSize: Math.max(18, Math.round(size / 2)) }}>
        🏅
      </span>
    </div>
  );
}
