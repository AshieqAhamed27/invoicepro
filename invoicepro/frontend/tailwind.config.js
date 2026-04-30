/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        app: {
          background: '#0f172a',
          card: '#1e293b'
        }
      },
      boxShadow: {
        glow: '0 24px 80px rgba(59, 130, 246, 0.16)'
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.45s infinite'
      }
    }
  },
  plugins: []
};
