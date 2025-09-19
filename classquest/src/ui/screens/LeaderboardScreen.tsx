import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { LeaderboardRow } from '~/ui/components/LeaderboardRow';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function LeaderboardScreen() {
  const { state } = useApp();
  const [sort, setSort] = useState<'name' | 'xp'>('xp');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleBeforePrint = () => setPrinting(true);
    const handleAfterPrint = () => setPrinting(false);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const rows = useMemo(() => {
    const list = state.students.map((student) => ({ id: student.id, name: student.alias, xp: student.xp }));
    list.sort((a, b) => (sort === 'xp' ? b.xp - a.xp : a.name.localeCompare(b.name, 'de')));
    return list;
  }, [state.students, sort]);

  const maxXp = rows[0]?.xp ?? 0;
  const virtualizeSetting = Boolean(state.settings.flags?.virtualize);
  const shouldVirtualize = virtualizeSetting && !printing;
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 6,
    enabled: shouldVirtualize,
  });
  const virtualItems = shouldVirtualize ? rowVirtualizer.getVirtualItems() : [];

  return (
    <div className="leaderboard-screen" style={{ display: 'grid', gap: 12 }}>
      <div className="leaderboard-controls print-hide" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Leaderboard</h2>
        <div role="group" aria-label="Sortierung" style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => setSort('xp')} aria-pressed={sort === 'xp'}>
            nach XP
          </button>
          <button type="button" onClick={() => setSort('name')} aria-pressed={sort === 'name'}>
            nach Name
          </button>
        </div>
        <button type="button" className="print-hide" onClick={() => window.print()} style={{ marginLeft: 'auto' }}>
          Drucken
        </button>
      </div>
      <div
        className="leaderboard-print"
        ref={shouldVirtualize ? parentRef : undefined}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 8,
          maxHeight: shouldVirtualize ? '70vh' : undefined,
          overflow: shouldVirtualize ? 'auto' : 'visible',
        }}
      >
        {rows.length === 0 ? (
          <p style={{ margin: 0 }}>Noch keine Schüler angelegt.</p>
        ) : shouldVirtualize ? (
          <div style={{ position: 'relative', height: rowVirtualizer.getTotalSize() }}>
            {virtualItems.map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={row.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <LeaderboardRow rank={virtualRow.index + 1} name={row.name} xp={row.xp} maxXp={maxXp} />
                </div>
              );
            })}
          </div>
        ) : (
          rows.map((row, index) => (
            <LeaderboardRow key={row.id} rank={index + 1} name={row.name} xp={row.xp} maxXp={maxXp} />
          ))
        )}
      </div>
    </div>
  );
}