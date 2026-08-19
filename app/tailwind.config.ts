import type { Config } from 'tailwindcss';

/**
 * Design tokens.
 *
 * These were derived from the existing static HTML. If the real stylesheet
 * uses different values, change them HERE ONLY - no component hardcodes a
 * colour or a radius.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1560d0',
          hover: '#1152b4',
          light: '#e8f0fc',
        },
        ink: {
          DEFAULT: '#111827',
          muted: '#6b7280',
          faint: '#9ca3af',
        },
        line: {
          DEFAULT: '#e5e7eb',
          strong: '#d1d5db',
        },
        surface: {
          DEFAULT: '#ffffff',
          sunken: '#f9fafb',
        },
        danger: '#b42318',
        success: '#067647',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '2px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
