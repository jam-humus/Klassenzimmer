import { motion } from 'framer-motion';
import React from 'react';
import { useApp } from '~/app/AppContext';
import { selectClassProgressView } from '~/core/selectors/classProgress';
import { getFormattedClassProgressCopy } from '~/ui/components/classProgressFormatting';

const rocketSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 240" preserveAspectRatio="xMidYMid meet">
  <path d="M60 6c-14 22-24 66-24 108v44L18 196v34l42-14 42 14v-34l-18-38v-44C84 72 74 28 60 6Z" fill="black"/>
  <path d="M36 158c-6 12-16 20-24 24v40l48-32Z" fill="black"/>
  <path d="M84 158c6 12 16 20 24 24v40l-48-32Z" fill="black"/>
</svg>`;

const rocketMask = `url("data:image/svg+xml,${encodeURIComponent(rocketSvg)}")`;

const fillTransition = { type: 'spring', stiffness: 140, damping: 20, mass: 0.6 };

export default function WeeklyClassGoalRocket() {
  const { state } = useApp();
  const view = selectClassProgressView(state);
  const starLabel = state.settings.classStarsName ?? 'Stern';
  const { formattedCurrent, formattedStep, formattedRemaining, announcement } =
    getFormattedClassProgressCopy(view, starLabel);
  const pct = Math.max(0, Math.min(1, view.pct));

  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        justifyItems: 'center',
        padding: 16,
        borderRadius: 20,
        background: 'rgba(15,23,42,0.35)',
        border: '1px solid rgba(148,163,184,0.18)',
        maxWidth: 220,
        margin: '0 auto',
      }}
    >
      <div
        role="img"
        aria-label={announcement}
        style={{
          position: 'relative',
          width: 140,
          height: 240,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            WebkitMaskImage: rocketMask,
            maskImage: rocketMask,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            background: 'rgba(15,23,42,0.35)',
            filter: 'drop-shadow(0 14px 32px rgba(56,189,248,0.35))',
          }}
        />
        <motion.div
          aria-hidden
          initial={{ scaleY: 0 }}
          animate={{ scaleY: pct }}
          transition={fillTransition}
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'center bottom',
            WebkitMaskImage: rocketMask,
            maskImage: rocketMask,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            background:
              'linear-gradient(180deg, rgba(96,165,250,0.05) 0%, rgba(56,189,248,0.85) 45%, rgba(14,165,233,0.95) 100%)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            WebkitMaskImage: rocketMask,
            maskImage: rocketMask,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            border: '2px solid rgba(226,232,240,0.65)',
            borderRadius: 0,
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div
        aria-live="polite"
        style={{
          display: 'grid',
          gap: 4,
          textAlign: 'center',
          color: '#e2e8f0',
        }}
      >
        <strong style={{ fontSize: 20, letterSpacing: 0.4 }}>{formattedCurrent} / {formattedStep} XP</strong>
        <span style={{ fontSize: 13, opacity: 0.85 }}>
          Noch {formattedRemaining} XP bis zum nächsten {starLabel}
        </span>
      </div>
    </div>
  );
}
