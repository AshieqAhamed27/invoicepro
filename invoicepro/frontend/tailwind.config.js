/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Playfair Display', 'serif'],
      },
      colors: {
        ink: {
          50: '#f5f5f0',
          100: '#e8e8e0',
          200: '#d0d0c0',
          300: '#b0b0a0',
          400: '#888878',
          500: '#666658',
          600: '#4a4a3e',
          700: '#333328',
          800: '#1e1e16',
          900: '#0f0f0a',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      }
    },
  },
  plugins: [],
}
