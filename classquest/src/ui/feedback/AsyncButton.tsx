import React, { useState } from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  doneLabel?: string;
  busyLabel?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
};

export default function AsyncButton({
  children,
  doneLabel = 'Gespeichert',
  busyLabel = 'Speichern…',
  onClick,
  className,
  style,
  type,
  disabled,
  ...rest
}: Props) {
  const [state, setState] = useState<'idle'|'busy'|'done'>('idle');
  async function handle(e: React.MouseEvent<HTMLButtonElement>) {
    try {
      setState('busy');
      await Promise.resolve(onClick(e));
      setState('done');
      setTimeout(() => setState('idle'), 1200);
    } catch (error) {
      setState('idle');
      throw error;
    }
  }
  const label = state === 'busy' ? busyLabel : state === 'done' ? doneLabel : children;
  return (
    <button
      {...rest}
      type={type ?? 'button'}
      onClick={handle}
      disabled={disabled || state === 'busy'}
      className={`button ${className ?? ''}`.trim()}
      style={{ ...style, position: 'relative' }}
    >
      {label}
    </button>
  );
}
