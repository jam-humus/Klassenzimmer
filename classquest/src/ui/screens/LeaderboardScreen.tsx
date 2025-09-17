import React, { useMemo, useState } from 'react';
import { useApp } from '~/app/AppContext';
import { LeaderboardRow } from '~/ui/components/LeaderboardRow';

export default function LeaderboardScreen() {
  const { state } = useApp();
  const [sort, setSort] = useState<'name' | 'xp'>('xp');

  const rows = useMemo(() => {
    // Beinhaltet 'id' für einen stabilen Key
    const list = state.students.map((student) => ({ id: student.id, name: student.alias, xp: student.xp }));
    // Sortiert nach XP oder Name (mit deutscher Ländereinstellung)
    list.sort((a, b) => (sort === 'xp' ? b.xp - a.xp : a.name.localeCompare(b.name, 'de')));
    return list;
  }, [state.students, sort]);

  const maxXp = rows[0]?.xp ?? 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Leaderboard</h2>
        <div role="group" aria-label="Sortierung" style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => setSort('xp')} aria-pressed={sort === 'xp'}>nach XP</button>
          <button type="button" onClick={() => setSort('name')} aria-pressed={sort === 'name'}>nach Name</button>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 12, padding: 8 }}>
        {/* Behandelt den Fall, dass keine Schüler vorhanden sind */}
        {rows.length === 0 && <p style={{ margin: 0 }}>Noch keine Schüler angelegt.</p>}
        {/* Verwendet die stabile 'id' als Key */}
        {rows.map((row, index) => (
          <LeaderboardRow key={row.id} rank={index + 1} name={row.name} xp={row.xp} maxXp={maxXp} />
        ))}
      </div>
    </div>
  );
}