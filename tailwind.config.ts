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
        white: 'rgb(var(--rw-white) / <alpha-value>)',
        slate: {
          50: 'rgb(var(--rw-slate-50) / <alpha-value>)',
          100: 'rgb(var(--rw-slate-100) / <alpha-value>)',
          200: 'rgb(var(--rw-slate-200) / <alpha-value>)',
          300: 'rgb(var(--rw-slate-300) / <alpha-value>)',
          400: 'rgb(var(--rw-slate-400) / <alpha-value>)',
          500: 'rgb(var(--rw-slate-500) / <alpha-value>)',
          600: 'rgb(var(--rw-slate-600) / <alpha-value>)',
          700: 'rgb(var(--rw-slate-700) / <alpha-value>)',
          800: 'rgb(var(--rw-slate-800) / <alpha-value>)',
          900: 'rgb(var(--rw-slate-900) / <alpha-value>)',
          950: 'rgb(var(--rw-slate-950) / <alpha-value>)',
        },
        app: {
          light: 'rgb(var(--rw-app-content) / <alpha-value>)',
          dark: 'rgb(var(--rw-app-content) / <alpha-value>)',
          content: 'rgb(var(--rw-app-content) / <alpha-value>)',
          sidebar: 'rgb(var(--rw-app-sidebar) / <alpha-value>)',
          panel: 'rgb(var(--rw-app-panel) / <alpha-value>)',
          elevated: 'rgb(var(--rw-app-elevated) / <alpha-value>)',
          hover: 'rgb(var(--rw-app-hover) / <alpha-value>)',
          border: 'rgb(var(--rw-app-border) / <alpha-value>)',
          muted: 'rgb(var(--rw-app-muted) / <alpha-value>)',
          foreground: 'rgb(var(--rw-app-text) / <alpha-value>)',
        },
        success: {
          50: 'rgb(var(--rw-success-50) / <alpha-value>)',
          100: 'rgb(var(--rw-success-100) / <alpha-value>)',
          400: 'rgb(var(--rw-success-400) / <alpha-value>)',
          500: 'rgb(var(--rw-success-500) / <alpha-value>)',
          600: 'rgb(var(--rw-success-600) / <alpha-value>)',
        },
        danger: {
          50: 'rgb(var(--rw-danger-50) / <alpha-value>)',
          100: 'rgb(var(--rw-danger-100) / <alpha-value>)',
          400: 'rgb(var(--rw-danger-400) / <alpha-value>)',
          500: 'rgb(var(--rw-danger-500) / <alpha-value>)',
          600: 'rgb(var(--rw-danger-600) / <alpha-value>)',
        },
        surface: {
          50: 'rgb(var(--rw-slate-50) / <alpha-value>)',
          100: 'rgb(var(--rw-slate-100) / <alpha-value>)',
          200: 'rgb(var(--rw-slate-200) / <alpha-value>)',
          900: 'rgb(var(--rw-slate-900) / <alpha-value>)',
        },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config
