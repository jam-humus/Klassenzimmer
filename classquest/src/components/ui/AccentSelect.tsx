import { useTheme } from '@/theme/useTheme';

export default function AccentSelect() {
  const { accent, setAccent, accents } = useTheme();

  return (
    <div className="accent-swatch-group" role="group" aria-label="Akzentfarbe wählen">
      {accents.map((option) => (
        <button
          key={option.id}
          type="button"
          className="accent-swatch"
          style={{ background: option.value }}
          data-active={accent === option.id}
          onClick={() => setAccent(option.id)}
          aria-pressed={accent === option.id}
          aria-label={option.label}
        />
      ))}
    </div>
  );
}
