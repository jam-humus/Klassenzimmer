import React from 'react';

export default function InfoScreen() {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h2>Info &amp; Hilfe</h2>
        <p>
          ClassQuest unterstützt nun globale Tastaturkürzel, eine schnelle Befehls-Palette und Filter zum schnellen
          Finden von Inhalten. Öffne die Hilfe mit <kbd>?</kbd> oder probiere <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+
          <kbd>K</kbd>, um nach Schülern, Quests oder Aktionen zu suchen.
        </p>
        <p>
          In den Einstellungen kannst du Tastaturkürzel deaktivieren. Die Befehlspalette durchsucht Navigation,
          Aktionen, Schüler, Quests und Gruppen, so dass du blitzschnell springen kannst.
        </p>
      </section>
      <section style={{ background: '#fff', padding: 16, borderRadius: 16 }}>
        <h3>Tipps</h3>
        <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
          <li>
            <strong>Virtuelle Listen</strong> sorgen auf großen Klassenlisten für flüssige Navigation. Du findest die
            Option unter <em>Verwalten &rarr; Einstellungen</em>.
          </li>
          <li>
            Die neuen Filter über dem Leaderboard und dem Protokoll helfen dir, Namen und Ereignisse zu finden.
            Verwende <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>F</kbd>, um sie zu fokussieren.
          </li>
          <li>
            Über die Saison-Reset-Funktion kannst du XP, Level und das Protokoll für einen frischen Start zurücksetzen –
            Schüler, Gruppen und Quests bleiben erhalten.
          </li>
        </ul>
      </section>
    </div>
  );
}
