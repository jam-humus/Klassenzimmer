export const themes = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
] as const;

export const accents = [
  { id: 'electricBlue', label: 'Electric Blue', value: '#22d3ee' },
  { id: 'vividOrange', label: 'Vivid Orange', value: '#fb923c' },
  { id: 'magentaPop', label: 'Magenta Pop', value: '#e879f9' },
  { id: 'emerald', label: 'Emerald', value: '#34d399' },
] as const;

export const backgrounds = [
  { id: 'none', label: 'None' },
  { id: 'starfield', label: 'Starfield', asset: '/bg/starfield.svg' },
  { id: 'treasure', label: 'Treasure Map', asset: '/bg/treasure.svg' },
] as const;

export type ThemeId = typeof themes[number]['id'];
export type AccentId = typeof accents[number]['id'];
export type BackgroundId = typeof backgrounds[number]['id'];

export const defaultTheme: ThemeId = 'dark';
export const defaultAccent: AccentId = 'electricBlue';
export const defaultBackground: BackgroundId = 'starfield';
