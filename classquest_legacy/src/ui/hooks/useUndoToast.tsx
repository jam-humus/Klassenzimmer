import { useEffect, useState } from 'react';

export function useUndoToast() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);
  return { message, setMessage, clear: () => setMessage(null) };
}
