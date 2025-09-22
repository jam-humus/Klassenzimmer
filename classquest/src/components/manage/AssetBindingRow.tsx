import type { AssetEvent } from '~/types/settings';

type AssetOption = {
  id: string;
  name: string;
};

type AssetBindingRowProps = {
  event: AssetEvent;
  label: string;
  description: string;
  audioOptions: AssetOption[];
  lottieOptions: AssetOption[];
  audioValue?: string | null;
  lottieValue?: string | null;
  onChange: (kind: 'audio' | 'lottie', event: AssetEvent, key: string | null) => void;
  onTest: (event: AssetEvent) => void;
};

export default function AssetBindingRow({
  event: assetEvent,
  label,
  description,
  audioOptions,
  lottieOptions,
  audioValue,
  lottieValue,
  onChange,
  onTest,
}: AssetBindingRowProps) {
  const canTest = Boolean(audioValue) || Boolean(lottieValue);

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
          onChange={(changeEvent) => onChange('audio', assetEvent, changeEvent.target.value || null)}
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
        <select
          value={lottieValue ?? ''}
          onChange={(changeEvent) => onChange('lottie', assetEvent, changeEvent.target.value || null)}
          aria-label={`Animations-Binding für ${label}`}
          style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #cbd5f5', minWidth: 160 }}
        >
          <option value="">– Keine Animation –</option>
          {lottieOptions.map((option) => (
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
