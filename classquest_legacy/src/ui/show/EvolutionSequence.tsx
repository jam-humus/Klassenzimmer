import * as React from 'react';
import { useApp } from '~/app/AppContext';
import { AvatarView } from '~/ui/avatar/AvatarView';
import type { Student } from '~/types/models';
import { getAvatarStageUrl } from '~/core/show/avatarStageUrl';
import { ConfettiBurst } from '~/ui/show/ConfettiBurst';

type EvolutionPhase = 'preload' | 'shake' | 'flash' | 'reveal' | 'hold' | 'done';

type EvolutionSequenceProps = {
  student: Student;
  fromStage: number;
  toStage: number;
  size?: number;
  totalMs?: number;
  onDone?: () => void;
};

/**
 * Pokémon-style evolution moment:
 * - shows previous avatar (center)
 * - brief shake (0.6s)
 * - white flash (0.25s)
 * - crossfade into new avatar with soft glow (0.8s)
 * - hold final for the remainder
 *
 * Total default ~2.2s, configurable via props.
 */
export default function EvolutionSequence({
  student,
  fromStage,
  toStage,
  size = 220,
  totalMs = 2200,
  onDone,
}: EvolutionSequenceProps) {
  const { state } = useApp();
  const [previousUrl, setPreviousUrl] = React.useState<string | null>(null);
  const [nextUrl, setNextUrl] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<EvolutionPhase>('preload');
  const [fallback, setFallback] = React.useState(false);
  const stateRef = React.useRef(state);
  const lastRequestedSignatureRef = React.useRef<string | null>(null);
  const lastCompletedSignatureRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  React.useEffect(() => {
    let cancelled = false;

    const rawStageKeys = student.avatarPack?.stageKeys;
    const packStageKeys = Array.isArray(rawStageKeys) ? rawStageKeys : [];
    const packKeys = packStageKeys.map((value) => value ?? '').join('|');
    const signature = `${student.id}:${student.avatarMode}:${fromStage}:${toStage}:${packKeys}`;

    if (lastCompletedSignatureRef.current === signature) {
      return;
    }

    lastRequestedSignatureRef.current = signature;
    setFallback(false);
    setPreviousUrl(null);
    setNextUrl(null);
    setPhase('preload');

    (async () => {
      const [prev, next] = await Promise.all([
        getAvatarStageUrl(stateRef.current, student, fromStage),
        getAvatarStageUrl(stateRef.current, student, toStage),
      ]);

      if (cancelled || lastRequestedSignatureRef.current !== signature) {
        return;
      }

      if (!prev || !next) {
        lastCompletedSignatureRef.current = signature;
        setFallback(true);
        setPhase('done');
        onDone?.();
        return;
      }

      lastCompletedSignatureRef.current = signature;
      setPreviousUrl(prev);
      setNextUrl(next);
      setPhase('shake');
    })();

    return () => {
      cancelled = true;
    };
  }, [student, fromStage, toStage, onDone]);

  React.useEffect(() => {
    if (phase === 'preload' || fallback) {
      return;
    }

    if (typeof window === 'undefined') {
      if (phase !== 'done') {
        setPhase('done');
        onDone?.();
      }
      return;
    }

    const total = Math.max(0, totalMs);
    const shakeDuration = Math.round(total * 0.27);
    const flashDuration = Math.round(total * 0.11);
    const revealDuration = Math.round(total * 0.36);
    const holdDuration = Math.max(0, total - (shakeDuration + flashDuration + revealDuration));
    const timers: number[] = [];

    if (phase === 'shake') {
      timers.push(window.setTimeout(() => setPhase('flash'), shakeDuration));
    } else if (phase === 'flash') {
      timers.push(window.setTimeout(() => setPhase('reveal'), flashDuration));
    } else if (phase === 'reveal') {
      timers.push(window.setTimeout(() => setPhase('hold'), revealDuration));
    } else if (phase === 'hold') {
      timers.push(
        window.setTimeout(() => {
          setPhase('done');
          onDone?.();
        }, holdDuration),
      );
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [phase, totalMs, onDone, fallback]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  const borderRadius = Math.min(size / 2, 24);
  const imageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: size,
    height: size,
    objectFit: 'cover',
    borderRadius,
    transition: 'opacity 0.8s ease',
  };

  if (fallback) {
    return (
      <div style={containerStyle}>
        <AvatarView student={student} size={size} rounded="xl" />
      </div>
    );
  }

  const revealActive = phase === 'reveal' || phase === 'hold' || phase === 'done';
  const confettiActive = phase === 'reveal' || phase === 'hold' || phase === 'done';

  return (
    <div style={containerStyle}>
      {phase !== 'preload' && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -32,
            right: -32,
            bottom: -32,
            left: -32,
            borderRadius: size,
            background: 'radial-gradient(40% 40% at 50% 50%, rgba(255,220,100,0.32), transparent 60%)',
            opacity: phase === 'shake' ? 0.6 : 0.85,
            filter: 'blur(36px)',
            pointerEvents: 'none',
            transition: 'opacity 300ms ease',
          }}
        />
      )}

      <div
        aria-hidden="true"
        className={phase === 'reveal' ? 'evo-glow' : undefined}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius,
          boxShadow: '0 0 0 0 rgba(255, 204, 102, 0.65)',
          pointerEvents: 'none',
          mixBlendMode: 'screen',
        }}
      />

      {previousUrl && (
        <img
          src={previousUrl}
          alt="Vorheriger Avatar"
          className={phase === 'shake' ? 'evo-shake' : undefined}
          style={{
            ...imageStyle,
            opacity: revealActive ? 0 : 1,
          }}
        />
      )}

      <div
        aria-hidden="true"
        className={phase === 'flash' ? 'evo-flash' : undefined}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius,
          backgroundColor: '#ffffff',
          opacity: phase === 'flash' ? undefined : 0,
          pointerEvents: 'none',
        }}
      />

      {nextUrl && (
        <img
          src={nextUrl}
          alt="Neuer Avatar"
          className={revealActive ? 'evo-reveal' : undefined}
          style={{
            ...imageStyle,
            opacity: revealActive ? 1 : 0,
            transform: revealActive ? undefined : 'scale(0.9)',
            transformOrigin: '50% 50%',
          }}
        />
      )}

      <ConfettiBurst active={confettiActive} size={size} />

      <span className="sr-only" aria-live="polite">
        {phase === 'reveal' && 'Avatar hat sich entwickelt.'}
      </span>

      <style>{`
        @keyframes evoShake {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          10% { transform: translate(-1px, 1px) rotate(-0.5deg); }
          20% { transform: translate(1px, -1px) rotate(0.5deg); }
          30% { transform: translate(-1px, 0) rotate(-0.4deg); }
          40% { transform: translate(1px, 1px) rotate(0.4deg); }
          50% { transform: translate(0, -1px) rotate(0deg); }
          60% { transform: translate(1px, 0) rotate(0.4deg); }
          70% { transform: translate(-1px, 1px) rotate(-0.4deg); }
          80% { transform: translate(1px, -1px) rotate(0.5deg); }
          90% { transform: translate(0, 1px) rotate(-0.5deg); }
        }
        .evo-shake {
          animation: evoShake 600ms ease-in-out both;
        }
        .evo-glow {
          animation: evoGlow 1100ms ease-out both;
        }
        @keyframes evoFlash {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }
        .evo-flash {
          animation: evoFlash 250ms ease-out both;
        }
        @keyframes evoGlow {
          0% { box-shadow: 0 0 0 0 rgba(255, 204, 102, 0.0); opacity: 0; }
          25% { box-shadow: 0 0 18px 6px rgba(255, 204, 102, 0.65); opacity: 1; }
          80% { box-shadow: 0 0 36px 14px rgba(255, 204, 102, 0.4); opacity: 0.4; }
          100% { box-shadow: 0 0 48px 16px rgba(255, 204, 102, 0.0); opacity: 0; }
        }
        .evo-reveal {
          animation: evoReveal 800ms cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
        @keyframes evoReveal {
          0% { opacity: 0; transform: scale(0.82); filter: drop-shadow(0 0 0 rgba(255, 220, 120, 0)); }
          50% { opacity: 1; transform: scale(1.08); filter: drop-shadow(0 0 16px rgba(255, 220, 120, 0.45)); }
          100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 6px rgba(255, 220, 120, 0.3)); }
        }
      `}</style>
    </div>
  );
}
