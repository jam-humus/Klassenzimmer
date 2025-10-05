import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/theme/useTheme';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isLight = theme === 'light';
  const shouldReduceMotion = useReducedMotion();

  const handleToggle = () => {
    setTheme(isLight ? 'dark' : 'light');
  };

  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2 };

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={handleToggle}
      aria-pressed={isLight}
      aria-label={isLight ? 'Lichtmodus aktiv' : 'Dunkelmodus aktiv'}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {isLight ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={transition}
            aria-hidden
          >
            <Sun height={18} width={18} />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={transition}
            aria-hidden
          >
            <Moon height={18} width={18} />
          </motion.span>
        )}
      </AnimatePresence>
      <span className="theme-toggle__label">{isLight ? 'Light' : 'Dark'}</span>
    </button>
  );
}
