/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface-2) / <alpha-value>)',
        line: 'rgb(var(--border) / <alpha-value>)',
        b900: 'rgb(var(--brown-900) / <alpha-value>)',
        b700: 'rgb(var(--brown-700) / <alpha-value>)',
        b500: 'rgb(var(--brown-500) / <alpha-value>)',
        caramel: 'rgb(var(--caramel) / <alpha-value>)',
        sand: 'rgb(var(--sand) / <alpha-value>)',
        ink: 'rgb(var(--text) / <alpha-value>)',
        inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Poppins', 'Noto Sans Telugu', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'system-ui', 'sans-serif'],
        display: ['"Bebas Neue"', 'Anton', 'Poppins', 'sans-serif'],
      },
      borderRadius: { card: '24px', xl2: '28px' },
      boxShadow: {
        soft: '0 2px 4px rgba(59,36,20,.04), 0 10px 30px -8px rgba(59,36,20,.14)',
        lift: '0 4px 8px rgba(59,36,20,.06), 0 18px 40px -10px rgba(59,36,20,.22)',
        glow: '0 0 0 4px rgba(164,113,72,.25)',
      },
    },
  },
  plugins: [],
};
