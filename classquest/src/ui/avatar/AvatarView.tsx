import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { AVATAR_STAGE_COUNT, resolveAvatarStageIndex, sanitizeAvatarStageThresholds } from '~/core/avatarStages';
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
  return Array.from({ length: AVATAR_STAGE_COUNT }, (_, index) => {
    const value = raw[index];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  });
}

function pickStageKey(student: AvatarViewStudent, thresholds: readonly number[]) {
  if (student.avatarMode !== 'imagePack') {
    return null;
  }
  const keys = sanitizeStageKeys(student.avatarPack);
  const stageIndex = resolveAvatarStageIndex(student.level ?? 1, thresholds);
  const direct = keys[stageIndex];
  if (direct) {
    return direct;
  }
  for (let index = stageIndex; index >= 0; index -= 1) {
    const fallback = keys[index];
    if (fallback) {
      return fallback;
    }
  }
  for (let index = keys.length - 1; index >= 0; index -= 1) {
    const fallback = keys[index];
    if (fallback) {
      return fallback;
    }
  }
  return null;
}

export function AvatarView({ student, size = 56, rounded = 'full', className, style }: AvatarViewProps) {
  const { state } = useApp();
  const stageThresholds = useMemo(
    () => sanitizeAvatarStageThresholds(state.settings?.avatarStageThresholds),
    [state.settings?.avatarStageThresholds],
  );
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const stageKey = pickStageKey(student, stageThresholds);

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
