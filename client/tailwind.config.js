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
          // ── Base surfaces ─────────────────────────────────────────
          dark: '#09090B',   // Deep Obsidian — page canvas
          slate: '#0D0D10',   // Slightly lifted canvas
          card: '#141417',   // Card/panel surface
          surface: '#1A1820',   // Input fields, inner panels, table row hover
          border: '#232326',   // Metallic dark dividers

          // ── Typography ────────────────────────────────────────────
          text: '#F4F4F5',   // Near-white primary text
          label: '#D4D4D8',   // Secondary data labels
          muted: '#71717A',   // Timestamps, placeholders, axes

          // ── Accent palette ─────────────────────────────────────────
          // Champagne Gold — hero metrics, active states, balances
          accent: '#E6C17A',
          gold: '#E6C17A',
          'gold-dim': '#B8965A',

          // Amethyst Violet — badges, glow, hover ambient
          violet: '#C0B3FF',
          glow: '#7C6FCD',   // Ambient glow base for radials

          // ── Semantic status ────────────────────────────────────────
          emerald: '#4ADE80',   // Active / healthy
          amber: '#FCD34D',   // Warning / pending
          crimson: '#F87171',   // Overdue / error
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.02em',
      },
      boxShadow: {
        // Gold glow — CTAs and active nav items
        'glow-gold': '0 0 18px rgba(230,193,122,0.28), 0 0 6px rgba(230,193,122,0.15)',
        'glow-gold-lg': '0 0 32px rgba(230,193,122,0.35)',
        // Violet ambient glow
        'glow-violet': '0 0 16px rgba(192,179,255,0.2)',
        'glow-violet-lg': '0 0 28px rgba(192,179,255,0.3)',
        // Card elevation
        'card': '0 2px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(35,35,38,0.9)',
        'card-lg': '0 8px 32px rgba(0,0,0,0.7)',
      },
      backgroundImage: {
        // Ambient radial overlays on cards/sections
        'ambient-gold': 'radial-gradient(ellipse 60% 35% at 50% 0%, rgba(230,193,122,0.10) 0%, transparent 70%)',
        'ambient-violet': 'radial-gradient(ellipse 55% 30% at 80% 0%, rgba(192,179,255,0.08) 0%, transparent 65%)',
        'ambient-both': 'radial-gradient(ellipse 60% 35% at 20% 0%, rgba(230,193,122,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 30% at 80% 0%, rgba(192,179,255,0.07) 0%, transparent 60%)',
        // Gold gradient for hero metric values
        'gradient-gold': 'linear-gradient(135deg, #E6C17A 0%, #F5D9A0 50%, #B8965A 100%)',
        // Purple-gold performance line
        'gradient-chart': 'linear-gradient(90deg, rgba(230,193,122,0.6) 0%, rgba(192,179,255,0.6) 100%)',
      },
      borderRadius: {
        'card': '12px',
        'panel': '16px',
        'pill': '999px',
      },
      animation: {
        'gold-pulse': 'goldPulse 3s ease-in-out infinite',
      },
      keyframes: {
        goldPulse: {
          '0%, 100%': { boxShadow: '0 0 14px rgba(230,193,122,0.2)' },
          '50%': { boxShadow: '0 0 26px rgba(230,193,122,0.4)' },
        },
      },
    },
  },
  plugins: [],
}
