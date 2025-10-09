import React, { useState } from 'react';
import { useApp } from '~/app/AppContext';

export default function FirstRunWizard({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useApp();
  const [name, setName] = useState(state.settings.className || 'Meine Klasse');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault(); // Verhindert das Neuladen der Seite
    const trimmed = name.trim() || 'Meine Klasse';
    setName(trimmed);

    // Sendet eine gezielte Aktion, um die Einstellungen zu aktualisieren
    dispatch({
      type: 'UPDATE_SETTINGS',
      updates: { className: trimmed, onboardingCompleted: true },
    });

    onDone();
  };

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', background: '#fff', borderRadius: 16, padding: 16 }}>
      <h1>Willkommen zu ClassQuest</h1>
      <p>Lege einen Klassennamen fest.</p>
      {/* Korrekte Verwendung eines Form-Elements */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          <span className="sr-only">Klassenname</span>
          <input
            aria-label="Klassenname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        <div>
          <button type="submit">Weiter</button>
        </div>
      </form>
    </div>
  );
}