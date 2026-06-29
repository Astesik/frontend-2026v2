import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        app: {
          light: '#f5f6f8',
          dark: '#343437',
          panel: '#343437',
          elevated: '#48484d',
          border: '#5a5a60',
          muted: '#b9bac2',
        },
        success: {
          50: '#ecfdf3',
          100: '#d1fadf',
          400: '#32d583',
          500: '#12b76a',
          600: '#039855',
        },
        danger: {
          50: '#fef3f2',
          100: '#fee4e2',
          400: '#f97066',
          500: '#f04438',
          600: '#d92d20',
        },
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          900: '#0f172a',
        },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config
