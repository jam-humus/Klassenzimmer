import type { AppSoundEvent } from '~/types/settings';

type AssetOption = {
  id: string;
  name: string;
};

type AssetBindingRowProps = {
  event: AppSoundEvent;
  label: string;
  description: string;
  audioOptions: AssetOption[];
  audioValue?: string | null;
  onChange: (event: AppSoundEvent, key: string | null) => void;
  onTest: (event: AppSoundEvent) => void;
};

export default function AssetBindingRow({
  event: assetEvent,
  label,
  description,
  audioOptions,
  audioValue,
  onChange,
  onTest,
}: AssetBindingRowProps) {
  const canTest = Boolean(audioValue);

  return (
    <tr>
      <th scope="row" style={{ textAlign: 'left', padding: '10px 8px' }}>
        <div style={{ display: 'grid', gap: 2 }}>
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>{description}</span>
        </div>
      </th>
      <td style={{ padding: '10px 8px' }}>
        <select
          value={audioValue ?? ''}
          onChange={(changeEvent) => onChange(assetEvent, changeEvent.target.value || null)}
          aria-label={`Audio-Binding für ${label}`}
          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5f5', minWidth: 160 }}
        >
          <option value="">– Kein Audio –</option>
          {audioOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </td>
      <td style={{ padding: '10px 8px' }}>
        <button
          type="button"
          onClick={() => onTest(assetEvent)}
          disabled={!canTest}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #4ade80',
            backgroundColor: canTest ? '#bbf7d0' : '#e2e8f0',
            color: '#166534',
            fontWeight: 600,
            cursor: canTest ? 'pointer' : 'not-allowed',
          }}
        >
          Testen
        </button>
      </td>
    </tr>
  );
}
