/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121316',
        slate2: '#2A2D34',
        gold: '#D4AF37',
        golddark: '#B8952E',
        paper: '#FAFAFA',
        muted: '#6B7280',
      },
      fontFamily: {
        heading: ['"Hind Siliguri"', 'sans-serif'],
        body: ['"Noto Sans Bengali"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 24px -4px rgba(0,0,0,0.08)',
        cardhover: '0 16px 32px -8px rgba(0,0,0,0.16)',
      },
      borderRadius: {
        sm2: '6px',
        md2: '12px',
        xl2: '14px',
      },
    },
  },
  plugins: [],
}
