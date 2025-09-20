import React, { useEffect, useState } from 'react';
import type { Student } from '~/types/models';
import { getObjectURL } from '~/services/blobStore';

export type AvatarViewStudent = Pick<Student, 'alias' | 'avatarMode' | 'avatarPack' | 'level' | 'xp'>;

type AvatarViewProps = {
  student: AvatarViewStudent;
  size?: number;
  rounded?: 'full' | 'xl' | 'lg';
  className?: string;
  style?: React.CSSProperties;
};

const roundedRadius: Record<NonNullable<AvatarViewProps['rounded']>, number> = {
  full: 999,
  xl: 24,
  lg: 16,
};

function sanitizeStageKeys(pack: AvatarViewStudent['avatarPack']) {
  const raw = Array.isArray(pack?.stageKeys) ? pack?.stageKeys ?? [] : [];
  return raw
    .map((key) => {
      if (typeof key !== 'string') {
        return null;
      }
      const trimmed = key.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .filter((key): key is string => Boolean(key));
}

function pickStageKey(student: AvatarViewStudent) {
  if (student.avatarMode !== 'imagePack') {
    return null;
  }
  const keys = sanitizeStageKeys(student.avatarPack);
  if (!keys.length) {
    return null;
  }
  // Prefer the highest defined stage, teachers often upload progressively impressive artwork.
  return keys[keys.length - 1];
}

export function AvatarView({ student, size = 56, rounded = 'full', className, style }: AvatarViewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const stageKey = pickStageKey(student);

  useEffect(() => {
    let cancelled = false;
    if (!stageKey) {
      setObjectUrl(null);
      return () => undefined;
    }
    (async () => {
      try {
        const url = await getObjectURL(stageKey);
        if (!cancelled) {
          setObjectUrl(url ?? null);
        }
      } catch (error) {
        console.warn('Avatar konnte nicht geladen werden', error);
        if (!cancelled) {
          setObjectUrl(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stageKey]);

  const borderRadius = rounded === 'full' ? size / 2 : roundedRadius[rounded];
  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius,
    overflow: 'hidden',
    flexShrink: 0,
    border: '1px solid rgba(15,23,42,0.12)',
    background: 'linear-gradient(135deg, #dbeafe, #bbf7d0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  if (objectUrl) {
    return (
      <img
        src={objectUrl}
        alt={student.alias}
        className={className}
        style={{ ...baseStyle, objectFit: 'cover' }}
      />
    );
  }

  const initial = student.alias?.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className={className} style={baseStyle} aria-label={student.alias}>
      <span
        style={{
          fontSize: Math.max(18, Math.round(size * 0.45)),
          fontWeight: 600,
          color: '#1e293b',
        }}
      >
        {initial}
      </span>
    </div>
  );
}

export default AvatarView;
