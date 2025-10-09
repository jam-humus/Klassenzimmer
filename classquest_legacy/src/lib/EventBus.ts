export type AppEvent =
  | { type: 'xp:granted'; amount: number; newSegmentXP: number }
  | { type: 'level:up'; newLevel: number }
  | { type: 'badge:awarded'; badgeId: string; studentId?: string }
  | { type: 'slideshow:avatar:present'; studentId: string }
  | { type: 'slideshow:badge:flyin'; badgeId: string };

type AnyHandler = (event: AppEvent) => void;

const registry = new Map<AppEvent['type'], Set<AnyHandler>>();

export const eventBus = {
  on<T extends AppEvent['type']>(type: T, handler: (event: Extract<AppEvent, { type: T }>) => void): () => void {
    const set = registry.get(type) ?? new Set<AnyHandler>();
    if (!registry.has(type)) {
      registry.set(type, set);
    }

    const wrapped: AnyHandler = (event) => {
      handler(event as Extract<AppEvent, { type: T }>);
    };

    set.add(wrapped);

    return () => {
      set.delete(wrapped);
      if (set.size === 0) {
        registry.delete(type);
      }
    };
  },
  emit(event: AppEvent): void {
    const handlers = registry.get(event.type);
    if (!handlers || handlers.size === 0) {
      return;
    }

    handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.warn(`[EventBus] Error while handling ${event.type}`, error);
      }
    });
  },
  clear(): void {
    registry.clear();
  },
};
