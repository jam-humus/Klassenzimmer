import React, { useEffect, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { DEFAULT_SETTINGS } from '~/core/config';
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

const DEFAULT_STAGE_THRESHOLDS = DEFAULT_SETTINGS.avatarStageThresholds ?? [3, 6];

function sanitizeStageKeys(pack: AvatarViewStudent['avatarPack']): (string | null)[] {
  const raw = Array.isArray(pack?.stageKeys) ? pack?.stageKeys ?? [] : [];
  return Array.from({ length: 3 }, (_, index) => {
    const candidate = raw[index];
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return null;
  });
}

function resolveStageThresholds(thresholds?: readonly number[] | null): [number, number] {
  if (!thresholds || thresholds.length < 2) {
    return [DEFAULT_STAGE_THRESHOLDS[0], DEFAULT_STAGE_THRESHOLDS[1]];
  }
  const first = Math.max(1, Math.floor(thresholds[0]));
  let second = Math.max(1, Math.floor(thresholds[1]));
  if (second <= first) {
    second = first + 1;
  }
  return [first, second];
}

function pickStageKey(student: AvatarViewStudent, thresholds: readonly number[]) {
  if (student.avatarMode !== 'imagePack') {
    return null;
  }
  const keys = sanitizeStageKeys(student.avatarPack);
  if (!keys.some(Boolean)) {
    return null;
  }
  const [stageTwoLevel, stageThreeLevel] = resolveStageThresholds(thresholds);
  const level = Math.max(1, Math.floor(student.level ?? 1));
  const desiredStage = level < stageTwoLevel ? 0 : level < stageThreeLevel ? 1 : 2;

  for (let index = desiredStage; index >= 0; index -= 1) {
    const key = keys[index];
    if (key) {
      return key;
    }
  }
  for (let index = desiredStage + 1; index < keys.length; index += 1) {
    const key = keys[index];
    if (key) {
      return key;
    }
  }
  return null;
}

export function AvatarView({ student, size = 56, rounded = 'full', className, style }: AvatarViewProps) {
  const { state } = useApp();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const thresholds = resolveStageThresholds(state.settings.avatarStageThresholds);
  const stageKey = pickStageKey(student, thresholds);

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
