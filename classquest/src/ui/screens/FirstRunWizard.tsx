import React, { useState } from 'react';
import { useApp } from '~/app/AppContext';

export default function FirstRunWizard({ onDone }: { onDone: ()=>void }) {
  const { state, dispatch } = useApp();
  const [name, setName] = useState(state.settings.className || 'Meine Klasse');
  return (
    <div style={{ maxWidth:640, margin:'40px auto', background:'#fff', borderRadius:16, padding:16 }}>
      <h1>Willkommen zu ClassQuest</h1>
      <p>Lege einen Klassen­namen fest.</p>
      <label>
        <span className="sr-only">Klassenname</span>
        <input aria-label="Klassenname" autoFocus value={name} onChange={e=>setName(e.target.value)} />
      </label>
      <div style={{ marginTop:12 }}>
        <button type="button" onClick={()=>{
          const json = JSON.stringify({ ...state, settings:{ ...state.settings, className: name }});
          dispatch({ type:'IMPORT', json });
          onDone();
        }}>Weiter</button>
      </div>
    </div>
  );
}
