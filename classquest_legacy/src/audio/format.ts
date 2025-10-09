const AUDIO_MIME_TO_FORMAT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/aac': 'aac',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
};

const EXTENSION_REGEX = /\.([a-z0-9]+)(?:\?|#|$)/i;

export function audioFormatFromMime(mime?: string | null): string | undefined {
  if (!mime) {
    return undefined;
  }
  const normalized = mime.split(';', 1)[0]?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (AUDIO_MIME_TO_FORMAT[normalized]) {
    return AUDIO_MIME_TO_FORMAT[normalized];
  }
  if (normalized.startsWith('audio/')) {
    const candidate = normalized.slice(6);
    if (!candidate) {
      return undefined;
    }
    return candidate.startsWith('x-') ? candidate.slice(2) : candidate;
  }
  return undefined;
}

export function normalizeAudioFormat(
  value?: string | string[] | null,
): string | string[] | undefined {
  if (!value) {
    return undefined;
  }

  const normalizeItem = (item: string | undefined | null): string | null => {
    if (!item) {
      return null;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      return null;
    }
    const lower = trimmed.toLowerCase();
    if (lower.includes('/')) {
      return audioFormatFromMime(lower) ?? null;
    }
    return lower.replace(/^\./, '');
  };

  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => normalizeItem(entry))
      .filter((entry): entry is string => Boolean(entry));
    if (!normalized.length) {
      return undefined;
    }
    if (normalized.length === 1) {
      return normalized[0];
    }
    return Array.from(new Set(normalized));
  }

  return normalizeItem(value) ?? undefined;
}

export function inferAudioFormatFromSource(source: string): string | null {
  if (!source) {
    return null;
  }
  const match = source.match(EXTENSION_REGEX);
  if (match?.[1]) {
    return match[1].toLowerCase();
  }
  return null;
}

export function extractMimeFromDataUrl(source: string): string | null {
  if (!source.startsWith('data:')) {
    return null;
  }
  const mime = source.slice(5).split(';', 1)[0];
  return mime ? mime.trim() : null;
}

