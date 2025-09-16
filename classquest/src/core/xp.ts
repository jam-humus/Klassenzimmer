export function levelFromXP(xp: number, xpPerLevel: number): number {
  if (xpPerLevel <= 0) return 1;
  return Math.floor(Math.max(0, xp) / xpPerLevel) + 1;
}

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
