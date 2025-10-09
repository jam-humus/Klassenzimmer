export type PaletteEntry = { label: string; keywords?: string };

export function filterPaletteEntries<T extends PaletteEntry>(items: T[], query: string): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }
  return items.filter((item) => {
    const haystack = item.label.toLowerCase();
    if (haystack.includes(normalized)) {
      return true;
    }
    if (item.keywords) {
      return item.keywords.toLowerCase().includes(normalized);
    }
    return false;
  });
}
