import * as React from 'react';

type ConfettiBurstProps = {
  /** Whether the burst should play. When switching from false to true, a new burst starts. */
  active: boolean;
  /** Size (in px) used to size the canvas square. */
  size: number;
  /** Optional callback once the animation has fully finished. */
  onDone?: () => void;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  color: string;
  life: number;
  ttl: number;
  shape: 'rect' | 'triangle' | 'circle';
};

const COLORS = ['#ffbf3f', '#ff6fb7', '#66d4ff', '#94f6a7'];

const random = (min: number, max: number) => Math.random() * (max - min) + min;

function createParticles(count: number, centerX: number, centerY: number, radius: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = random(0, Math.PI * 2);
    const speed = random(120, 280);
    const size = random(4, 10);
    const shapeRand = Math.random();
    const shape: Particle['shape'] = shapeRand < 0.33 ? 'rect' : shapeRand < 0.66 ? 'triangle' : 'circle';

    particles.push({
      x: centerX + Math.cos(angle) * radius * random(0, 0.45),
      y: centerY + Math.sin(angle) * radius * random(0, 0.45),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: random(0, Math.PI * 2),
      vr: random(-5, 5),
      size,
      color: COLORS[i % COLORS.length],
      life: 0,
      ttl: random(650, 1200),
      shape,
    });
  }
  return particles;
}

function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation);
  ctx.fillStyle = particle.color;

  switch (particle.shape) {
    case 'triangle': {
      const s = particle.size;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.6);
      ctx.lineTo(s * 0.6, s * 0.6);
      ctx.lineTo(-s * 0.6, s * 0.6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'circle': {
      ctx.beginPath();
      ctx.arc(0, 0, particle.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    }
  }

  ctx.restore();
}

/**
 * Lightweight celebratory burst rendered on a canvas. Draws once per activation and disposes.
 */
export function ConfettiBurst({ active, size, onDone }: ConfettiBurstProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const animationRef = React.useRef<number>();
  const particlesRef = React.useRef<Particle[] | null>(null);

  React.useEffect(() => {
    if (!active) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      particlesRef.current = null;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const displaySize = size * 1.4;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    const ctxWithReset = ctx as CanvasRenderingContext2D & { resetTransform?: () => void };
    if (typeof ctxWithReset.resetTransform === 'function') {
      ctxWithReset.resetTransform();
    } else {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.scale(dpr, dpr);

    const origin = displaySize / 2;
    particlesRef.current = createParticles(120, origin, origin, displaySize / 2);

    const gravity = 420; // px per second^2
    let lastTime: number | undefined;

    const step = (timestamp: number) => {
      const particles = particlesRef.current;
      if (!particles) {
        return;
      }

      if (lastTime === undefined) {
        lastTime = timestamp;
      }

      const deltaMs = timestamp - lastTime;
      lastTime = timestamp;
      const delta = deltaMs / 1000;

      ctx.clearRect(0, 0, displaySize, displaySize);

      let alive = 0;
      for (const particle of particles) {
        particle.life += deltaMs;
        if (particle.life >= particle.ttl) {
          continue;
        }

        alive += 1;

        particle.vy += gravity * delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.rotation += particle.vr * delta;

        const fade = 1 - particle.life / particle.ttl;
        ctx.globalAlpha = Math.max(0, Math.min(1, fade));
        drawParticle(ctx, particle);
        ctx.globalAlpha = 1;
      }

      if (alive > 0) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        particlesRef.current = null;
        animationRef.current = undefined;
        onDone?.();
      }
    };

    animationRef.current = requestAnimationFrame(step);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [active, size, onDone]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}
    />
  );
}

