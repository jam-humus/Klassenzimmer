import type { Config } from 'tailwindcss';

const config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
        fg: 'rgb(var(--fg-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        card: 'rgb(var(--card-rgb) / <alpha-value>)',
        'card-fg': 'rgb(var(--card-fg-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        success: 'rgb(var(--success-rgb) / <alpha-value>)',
        warning: 'rgb(var(--warning-rgb) / <alpha-value>)',
        info: 'rgb(var(--info-rgb) / <alpha-value>)',
      },
      ringColor: {
        DEFAULT: 'rgb(var(--ring-rgb) / 0.5)',
      },
      borderColor: {
        DEFAULT: 'rgb(255 255 255 / 0.06)',
      },
      boxShadow: {
        'lg/10': '0 10px 25px rgba(0,0,0,0.10)',
        'xl/10': '0 20px 35px rgba(0,0,0,0.10)',
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
