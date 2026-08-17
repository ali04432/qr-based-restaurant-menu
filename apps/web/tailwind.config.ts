import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Design tokens — extend here as the design system grows
      colors: {
        brand: {
          50: 'hsl(24, 100%, 97%)',
          100: 'hsl(24, 100%, 93%)',
          200: 'hsl(24, 95%, 85%)',
          300: 'hsl(24, 90%, 72%)',
          400: 'hsl(24, 88%, 60%)',
          500: 'hsl(24, 85%, 50%)',   // primary brand orange
          600: 'hsl(24, 82%, 42%)',
          700: 'hsl(24, 78%, 35%)',
          800: 'hsl(24, 72%, 28%)',
          900: 'hsl(24, 68%, 22%)',
          950: 'hsl(24, 65%, 14%)',
        },
        surface: {
          DEFAULT: 'hsl(0, 0%, 100%)',
          muted: 'hsl(210, 20%, 98%)',
          elevated: 'hsl(0, 0%, 98%)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
