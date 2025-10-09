import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { backgrounds } from '@/config/theme.config';
import { useTheme } from '@/theme/useTheme';

export default function AppBackground() {
  const { bg } = useTheme();
  const background = backgrounds.find((definition) => definition.id === bg);
  const reduceMotion = useReducedMotion();

  if (!background || background.id === 'none') {
    return null;
  }

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.24 };

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: -10,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={background.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          exit={{ opacity: 0 }}
          transition={transition}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${background.asset})`,
            backgroundRepeat: 'repeat',
            backgroundSize: 'auto',
          }}
        />
      </AnimatePresence>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(120% 120% at 50% -10%, transparent, rgba(0,0,0,0.35))',
        }}
      />
    </div>
  );
}
