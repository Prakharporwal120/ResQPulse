/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070D17',
          900: '#0B192C',
          800: '#152C4A',
          700: '#1E3E62',
          600: '#2A5485',
        },
        teal: {
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
        },
        alert: {
          red: '#EF4444',
          amber: '#F59E0B',
          emerald: '#10B981',
          blue: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-emergency': 'emergencyFlash 1.5s infinite',
      },
      keyframes: {
        emergencyFlash: {
          '0%, 100%': { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
          '50%': { borderColor: 'rgba(239, 68, 68, 0.3)', backgroundColor: 'transparent' },
        }
      }
    },
  },
  plugins: [],
}
