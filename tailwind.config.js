/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Charcoal "night study" scale — custom names so no built-in
        // Tailwind color scale gets clobbered.
        ink: {
          950: '#0a0a0c',
          900: '#0e0e11',
          850: '#141418',
          800: '#17171c',
          700: '#1e1e24',
          600: '#26262e',
          500: '#33333d',
        },
        line: '#2a2a32',
        accent: {
          DEFAULT: '#c8f24d', // electric lime — the one loud color
          bright: '#d6f96e',
          dim: '#9fc93a',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 30px -14px rgba(0,0,0,0.7)',
        lift: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 24px 50px -18px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(200,242,77,0.4), 0 10px 40px -8px rgba(200,242,77,0.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
