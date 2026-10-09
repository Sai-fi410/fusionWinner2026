/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#FFFFFF',
        surface: {
          base: '#F8FAFC',
          card: '#FFFFFF',
          glass: 'rgba(255, 255, 255, 0.88)',
          border: '#E2E8F0',
          active: '#0284C7'
        },
        amr: {
          cyan: '#0284C7',
          green: '#10B981',
          amber: '#F59E0B',
          red: '#EF4444',
          gold: '#D97706',
          purple: '#8B5CF6'
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
