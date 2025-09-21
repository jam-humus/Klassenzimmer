import * as React from 'react';
import { useApp } from '~/app/AppContext';
import { AvatarView } from '~/ui/avatar/AvatarView';
import type { Student } from '~/types/models';
import { getAvatarStageUrl } from '~/core/show/avatarStageUrl';

type EvolutionPhase = 'preload' | 'shake' | 'flash' | 'reveal' | 'hold' | 'done';

type EvolutionSequenceProps = {
  student: Student;
  fromStage: number;
  toStage: number;
  levelStart: number;
  levelEnd: number;
  size?: number;
  totalMs?: number;
  onDone?: () => void;
};

const DEFAULT_TOTAL_MS = 2200;

function loadImage(url: string): Promise<void> {
  if (typeof Image === 'undefined') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      console.warn('Evolution image failed to preload', url);
      resolve();
    };
    img.src = url;
  });
}

function clampLevel(value: number | undefined): number {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return 1;
  }
  return Math.max(1, Math.floor(value ?? 1));
}

function playEvolutionChime(): void {
  if (typeof window === 'undefined') return;
  const withWebkit = window as typeof window & { webkitAudioContext?: typeof window.AudioContext };
  const AudioContextCtor = withWebkit.AudioContext ?? withWebkit.webkitAudioContext;
  if (!AudioContextCtor) return;
  try {
    const ctx = new AudioContextCtor();
    const base = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const gain = ctx.createGain();
    const shimmerGain = ctx.createGain();
    const now = ctx.currentTime;
    base.type = 'triangle';
    shimmer.type = 'sine';
    base.frequency.setValueAtTime(520, now);
    base.frequency.exponentialRampToValueAtTime(880, now + 0.45);
    shimmer.frequency.setValueAtTime(1560, now + 0.05);
    shimmer.frequency.exponentialRampToValueAtTime(990, now + 0.42);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.08, now + 0.12);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
    base.connect(gain);
    shimmer.connect(shimmerGain);
    gain.connect(ctx.destination);
    shimmerGain.connect(ctx.destination);
    base.start(now);
    shimmer.start(now + 0.04);
    base.stop(now + 0.65);
    shimmer.stop(now + 0.55);
    setTimeout(() => ctx.close().catch(() => undefined), 720);
  } catch (error) {
    console.warn('Evolution chime failed', error);
  }
}

export default function EvolutionSequence({
  student,
  fromStage,
  toStage,
  levelStart,
  levelEnd,
  size = 220,
  totalMs = DEFAULT_TOTAL_MS,
  onDone,
}: EvolutionSequenceProps) {
  const { state } = useApp();
  const animationsAllowed = state.settings?.animationsEnabled !== false;
  const sfxEnabled = state.settings?.sfxEnabled === true;
  const [phase, setPhase] = React.useState<EvolutionPhase>('preload');
  const [previousUrl, setPreviousUrl] = React.useState<string | null>(null);
  const [nextUrl, setNextUrl] = React.useState<string | null>(null);
  const [fallback, setFallback] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const allowMotion = animationsAllowed && !reduceMotion;
  const stateRef = React.useRef(state);
  const lastRequestedSignatureRef = React.useRef<string | null>(null);
  const lastCompletedSignatureRef = React.useRef<string | null>(null);
  const doneNotifiedRef = React.useRef(false);

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      setReduceMotion(false);
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', update);
      return () => query.removeEventListener('change', update);
    }
    query.addListener(update);
    return () => query.removeListener(update);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const rawStageKeys = student.avatarPack?.stageKeys;
    const packStageKeys = Array.isArray(rawStageKeys) ? rawStageKeys : [];
    const packKeys = packStageKeys.map((value) => value ?? '').join('|');
    const signature = `${student.id}:${student.avatarMode}:${fromStage}:${toStage}:${packKeys}:${allowMotion}`;

    if (lastCompletedSignatureRef.current === signature) {
      return;
    }

    lastRequestedSignatureRef.current = signature;
    lastCompletedSignatureRef.current = null;
    setFallback(false);
    setPreviousUrl(null);
    setNextUrl(null);
    setReady(false);
    setPhase('preload');

    if (!allowMotion) {
      lastCompletedSignatureRef.current = signature;
      setFallback(true);
      setReady(true);
      setPhase('done');
      return;
    }

    if (student.avatarMode !== 'imagePack') {
      lastCompletedSignatureRef.current = signature;
      setFallback(true);
      setReady(true);
      setPhase('shake');
      return;
    }

    (async () => {
      try {
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
          setReady(true);
          setPhase('shake');
          return;
        }

        await Promise.all([loadImage(prev), loadImage(next)]);
        if (cancelled || lastRequestedSignatureRef.current !== signature) {
          return;
        }

        lastCompletedSignatureRef.current = signature;
        setPreviousUrl(prev);
        setNextUrl(next);
        setReady(true);
        setPhase('shake');
      } catch (error) {
        if (cancelled || lastRequestedSignatureRef.current !== signature) {
          return;
        }
        console.warn('Evolution asset load failed', error);
        lastCompletedSignatureRef.current = signature;
        setFallback(true);
        setReady(true);
        setPhase('shake');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [student, fromStage, toStage, allowMotion]);

  React.useEffect(() => {
    if (!allowMotion) {
      return;
    }
    if (!ready) {
      return;
    }
    if (phase === 'preload' || phase === 'done') {
      return;
    }

    if (typeof window === 'undefined') {
      if (phase !== 'done') {
        setPhase('done');
      }
      return;
    }

    const total = Math.max(0, totalMs ?? DEFAULT_TOTAL_MS);
    const shakeDuration = Math.round(total * 0.27);
    const flashDuration = Math.round(total * 0.11);
    const revealDuration = Math.round(total * 0.36);
    const holdDuration = Math.max(0, total - (shakeDuration + flashDuration + revealDuration));

    const timers: number[] = [];
    const advance = (nextPhase: EvolutionPhase, delay: number) => {
      if (delay <= 0) {
        setPhase(nextPhase);
        return;
      }
      timers.push(
        window.setTimeout(() => {
          setPhase(nextPhase);
        }, delay),
      );
    };

    if (phase === 'shake') {
      advance('flash', shakeDuration);
    } else if (phase === 'flash') {
      advance('reveal', flashDuration);
    } else if (phase === 'reveal') {
      advance('hold', revealDuration);
    } else if (phase === 'hold') {
      advance('done', holdDuration);
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [phase, totalMs, allowMotion, ready]);

  React.useEffect(() => {
    if (phase === 'done') {
      if (!doneNotifiedRef.current) {
        doneNotifiedRef.current = true;
        onDone?.();
      }
    } else {
      doneNotifiedRef.current = false;
    }
  }, [phase, onDone]);

  React.useEffect(() => {
    if (!allowMotion) {
      return;
    }
    if (phase !== 'reveal') {
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fx:evolution', { detail: { studentId: student.id } }));
    }
    if (sfxEnabled) {
      playEvolutionChime();
    }
  }, [phase, allowMotion, sfxEnabled, student.id]);

  const previousAvatar = React.useMemo(
    () => ({
      alias: student.alias,
      avatarMode: student.avatarMode,
      avatarPack: student.avatarPack,
      level: clampLevel(levelStart),
      xp: student.xp ?? 0,
    }),
    [student.alias, student.avatarMode, student.avatarPack, student.xp, levelStart],
  );

  const nextAvatar = React.useMemo(
    () => ({
      alias: student.alias,
      avatarMode: student.avatarMode,
      avatarPack: student.avatarPack,
      level: clampLevel(levelEnd),
      xp: student.xp ?? 0,
    }),
    [student.alias, student.avatarMode, student.avatarPack, student.xp, levelEnd],
  );

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    transition: 'opacity 800ms ease',
  };

  const frameStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 800ms ease',
  };

  const flashStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: size,
    height: size,
    borderRadius,
    backgroundColor: '#ffffff',
    opacity: allowMotion && phase === 'flash' ? undefined : 0,
    pointerEvents: 'none',
  };

  const glowOffset = Math.round(size * 0.18);
  const burstSize = size * 1.55;
  const revealActive = phase === 'reveal' || phase === 'hold' || phase === 'done';
  const showImageLayers = !fallback && Boolean(previousUrl && nextUrl);
  const showFallbackLayers = !showImageLayers;

  return (
    <div style={containerStyle}>
      <div
        aria-hidden="true"
        className={`evo-glow ${phase !== 'preload' ? 'evo-glow-active' : ''} ${revealActive ? 'evo-glow-pulse' : ''}`}
        style={{
          position: 'absolute',
          top: -glowOffset,
          right: -glowOffset,
          bottom: -glowOffset,
          left: -glowOffset,
          borderRadius: size,
          background: 'radial-gradient(45% 45% at 50% 50%, rgba(255,220,120,0.35), rgba(255,220,120,0) 70%)',
        }}
      />

      {allowMotion && (
        <div
          aria-hidden="true"
          className={`evo-starburst ${revealActive ? 'evo-starburst-active' : ''}`}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: burstSize,
            height: burstSize,
            background:
              'conic-gradient(from -20deg, rgba(255,253,245,0.75) 0deg, rgba(255,253,245,0) 45deg, rgba(255,253,245,0) 90deg, rgba(255,253,245,0.6) 135deg, rgba(255,253,245,0) 180deg, rgba(255,253,245,0) 270deg, rgba(255,253,245,0.65) 320deg)',
            maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 18%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {showImageLayers && (
        <img
          src={previousUrl ?? undefined}
          alt="Vorheriger Avatar"
          className={allowMotion && phase === 'shake' ? 'evo-shake' : undefined}
          style={{
            ...imageStyle,
            opacity: revealActive ? 0 : 1,
          }}
        />
      )}

      {showFallbackLayers && (
        <div
          aria-hidden="true"
          className={allowMotion && phase === 'shake' ? 'evo-shake' : undefined}
          style={{
            ...frameStyle,
            opacity: revealActive ? 0 : 1,
          }}
        >
          <AvatarView student={previousAvatar} size={size} rounded="xl" />
        </div>
      )}

      <div aria-hidden="true" className={allowMotion && phase === 'flash' ? 'evo-flash' : undefined} style={flashStyle} />

      {showImageLayers && (
        <img
          src={nextUrl ?? undefined}
          alt="Neuer Avatar"
          className={allowMotion && revealActive ? 'evo-reveal' : undefined}
          style={{
            ...imageStyle,
            opacity: revealActive ? 1 : 0,
          }}
        />
      )}

      {showFallbackLayers && (
        <div
          aria-hidden="true"
          className={allowMotion && revealActive ? 'evo-reveal' : undefined}
          style={{
            ...frameStyle,
            opacity: revealActive ? 1 : 0,
          }}
        >
          <AvatarView student={nextAvatar} size={size} rounded="xl" />
        </div>
      )}

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
        @keyframes evoFlash {
          0% { opacity: 0; }
          20% { opacity: 1; }
          100% { opacity: 0; }
        }
        .evo-flash {
          animation: evoFlash 250ms ease-out both;
        }
        .evo-reveal {
          transition: opacity 800ms ease;
        }
        .evo-glow {
          opacity: 0;
          transform: scale(0.85);
          filter: blur(36px);
          transition: opacity 420ms ease, transform 600ms ease;
        }
        .evo-glow-active {
          opacity: 0.82;
          transform: scale(1);
        }
        .evo-glow-pulse {
          animation: evoGlowPulse 1400ms ease-in-out infinite alternate;
        }
        @keyframes evoGlowPulse {
          0% { opacity: 0.65; }
          100% { opacity: 0.88; }
        }
        .evo-starburst {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.68) rotate(-18deg);
          transition: opacity 340ms ease, transform 720ms cubic-bezier(0.19, 1, 0.22, 1);
        }
        .evo-starburst-active {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1) rotate(4deg);
        }
      `}</style>
    </div>
  );
}
