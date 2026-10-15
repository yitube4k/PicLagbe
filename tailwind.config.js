/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Hind Siliguri"', '"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Hind Siliguri"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        twilight: {
          950: '#06070d',
          900: '#0c0e1a',
          800: '#141829',
          700: '#1e243d',
        },
        sunset: {
          gold: '#fbbf24',
          amber: '#f59e0b',
          coral: '#f97316',
          crimson: '#e11d48',
          berry: '#9333ea',
        },
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
      boxShadow: {
        'glass-sm': '0 6px 20px -4px rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.14)',
        'glass-md': '0 12px 36px -8px rgba(0, 0, 0, 0.58), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)',
        'glass-lg': '0 24px 56px -12px rgba(0, 0, 0, 0.78), inset 0 1px 0 0 rgba(255, 255, 255, 0.22)',
        'sunset-glow': '0 10px 30px -6px rgba(249, 115, 22, 0.55), 0 0 20px -4px rgba(251, 191, 36, 0.35)',
        'sunset-glow-lg': '0 18px 46px -8px rgba(249, 115, 22, 0.72), 0 0 32px -2px rgba(251, 191, 36, 0.48)',
      },
      backgroundImage: {
        'sunset-gradient': 'linear-gradient(135deg, #f97316 0%, #fbbf24 55%, #e11d48 100%)',
        'sunset-soft': 'linear-gradient(135deg, rgba(249, 115, 22, 0.18) 0%, rgba(251, 191, 36, 0.14) 55%, rgba(225, 29, 72, 0.15) 100%)',
        'glass-shine': 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.03) 60%, transparent 100%)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseGlow: {
          '0%, 100%': {
            opacity: '0.75',
            boxShadow: '0 0 18px rgba(249, 115, 22, 0.35)',
          },
          '50%': {
            opacity: '1',
            boxShadow: '0 0 32px rgba(251, 191, 36, 0.65)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        marquee: 'marquee 30s linear infinite',
        spinSlow: 'spinSlow 8s linear infinite',
      },
    },
  },
  plugins: [],
};
