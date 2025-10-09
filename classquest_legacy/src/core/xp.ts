export const levelFromXP = (xp: number, xpPerLevel: number) => Math.floor(xp / xpPerLevel) + 1;

export const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = `${d.getMonth()+1}`.padStart(2,'0');
  const dd = `${d.getDate()}`.padStart(2,'0');
  return `${y}-${m}-${dd}`;
};
