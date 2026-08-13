import type { Config } from 'tailwindcss';

const zinc = {
  50: 'rgb(var(--zinc-50) / <alpha-value>)',
  100: 'rgb(var(--zinc-100) / <alpha-value>)',
  200: 'rgb(var(--zinc-200) / <alpha-value>)',
  300: 'rgb(var(--zinc-300) / <alpha-value>)',
  400: 'rgb(var(--zinc-400) / <alpha-value>)',
  500: 'rgb(var(--zinc-500) / <alpha-value>)',
  600: 'rgb(var(--zinc-600) / <alpha-value>)',
  700: 'rgb(var(--zinc-700) / <alpha-value>)',
  800: 'rgb(var(--zinc-800) / <alpha-value>)',
  900: 'rgb(var(--zinc-900) / <alpha-value>)',
  950: 'rgb(var(--zinc-950) / <alpha-value>)',
};

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        zinc,
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        border: 'hsl(var(--border))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
      },
    },
  },
  plugins: [],
};

export default config;
