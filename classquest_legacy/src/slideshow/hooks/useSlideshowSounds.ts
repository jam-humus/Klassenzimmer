import { useEffect, useRef } from 'react';
import { soundManager } from '@/audio/SoundManager';
import { eventBus } from '@/lib/EventBus';

const BADGE_FLYIN_DELAY_MS = 150;

export function useSlideshowSounds(): void {
  const badgeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    soundManager.init();
    soundManager.unlock();

    const handleBadgeFlyIn = () => {
      if (badgeTimeoutRef.current) {
        window.clearTimeout(badgeTimeoutRef.current);
      }

      badgeTimeoutRef.current = window.setTimeout(() => {
        soundManager.play('slideshow-badge-flyin');
        badgeTimeoutRef.current = null;
      }, BADGE_FLYIN_DELAY_MS);
    };

    const offBadgeFlyIn = eventBus.on('slideshow:badge:flyin', handleBadgeFlyIn);
    const offAvatarPresent = eventBus.on('slideshow:avatar:present', () => {
      soundManager.play('slideshow-avatar');
    });

    return () => {
      if (badgeTimeoutRef.current) {
        window.clearTimeout(badgeTimeoutRef.current);
        badgeTimeoutRef.current = null;
      }

      offBadgeFlyIn();
      offAvatarPresent();
    };
  }, []);
}
