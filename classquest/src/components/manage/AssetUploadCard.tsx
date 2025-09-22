import { type ChangeEvent, useId, useRef, useState } from 'react';

export type AssetUploadCardProps = {
  title: string;
  description: string;
  accept: string;
  hint: string;
  onUpload: (file: File) => Promise<void>;
  validate?: (file: File) => string | null;
};

export default function AssetUploadCard({
  title,
  description,
  accept,
  hint,
  onUpload,
  validate,
}: AssetUploadCardProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const validationError = validate?.(file) ?? null;
    if (validationError) {
      setError(validationError);
      event.target.value = '';
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
      setError(message);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <section
      aria-labelledby={inputId}
      style={{
        border: '1px solid #d0d7e6',
        borderRadius: 12,
        padding: 16,
        display: 'grid',
        gap: 12,
        backgroundColor: '#fff',
      }}
    >
      <header style={{ display: 'grid', gap: 4 }}>
        <h3 id={inputId} style={{ margin: 0, fontSize: 18 }}>
          {title}
        </h3>
        <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>{description}</p>
      </header>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={openFilePicker}
          disabled={uploading}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid #7c3aed',
            backgroundColor: uploading ? '#ede9fe' : '#c4b5fd',
            color: '#1f2937',
            fontWeight: 600,
            cursor: uploading ? 'progress' : 'pointer',
          }}
        >
          {uploading ? 'Lädt…' : 'Datei auswählen'}
        </button>
        <span style={{ fontSize: 12, color: '#64748b' }}>Erlaubt: {accept}</span>
        <input
          ref={inputRef}
          id={`${inputId}-input`}
          type="file"
          accept={accept}
          onChange={handleChange}
          aria-describedby={`${hintId}${error ? ` ${errorId}` : ''}`}
          style={{ display: 'none' }}
        />
      </div>
      <p id={hintId} style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
        {hint}
      </p>
      {error && (
        <p
          id={errorId}
          role="alert"
          style={{ margin: 0, fontSize: 13, color: '#b91c1c', fontWeight: 600 }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
