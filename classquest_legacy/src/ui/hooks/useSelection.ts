import { useCallback, useState } from 'react';

export function useSelection<T extends string>(initial: T[] = []) {
  const [selected, setSelected] = useState<Set<T>>(new Set(initial));
  const isSelected = useCallback((id: T) => selected.has(id), [selected]);
  const toggle = useCallback((id: T) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const clear = useCallback(() => setSelected(new Set()), []);
  const setMany = useCallback((ids: T[]) => setSelected(new Set(ids)), []);
  return { selected, isSelected, toggle, clear, setMany };
}
