/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0b1329',      // Deepest Navy background
          slate: '#0f172a',     // Dark slate secondary background
          card: '#1e293b',      // Institutional Navy card body
          border: '#334155',    // Border slate
          text: '#f8fafc',      // Light gray headings
          muted: '#94a3b8',     // Muted slate sub-captions
          accent: '#3b82f6',    // Slate secondary blue accent
          emerald: '#10b981',   // Recovery flow green
          amber: '#f59e0b',     // Alert-tier warning amber
          crimson: '#ef4444'    // Overdue metric crimson
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
