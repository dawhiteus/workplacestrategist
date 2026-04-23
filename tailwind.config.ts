import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // LiquidSpace primary scale
        ls: {
          50:  '#e6f1f8',
          100: '#cce3f1',
          200: '#99c7e3',
          300: '#66aad5',
          400: '#338ec7',
          500: '#005b94',
          600: '#004d7d',
          700: '#003f66',
          800: '#00304f',
          900: '#002238',
        },
        // Surfaces
        page:    '#f8f9fa',
        card:    '#ffffff',
        sidebar: '#ffffff',
        input:   '#f8f9fa',
        muted:   '#faf9f5',
        // Borders
        border:  '#e5e7eb',
        'border-strong': '#d1d5db',
        // Text
        body:    '#374151',
        subtle:  '#6b7280',
        disabled:'#9ca3af',
        // Status
        success: '#28a745',
        warning: '#ffa500',
        danger:  '#dc3545',
        teal:    '#00b8c4',
        purple:  '#7c3aed',
        slate:   '#5a6c7d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
        xs:    ['0.75rem',  { lineHeight: '1rem' }],
        sm:    ['0.8125rem',{ lineHeight: '1.25rem' }],
        base:  ['0.875rem', { lineHeight: '1.5rem' }],
      },
      borderRadius: {
        xs:   '4px',
        sm:   '8px',
        md:   '12px',
        lg:   '14px',
        xl:   '16px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        focus: '0 0 0 3px rgba(0,91,148,0.12)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      transitionDuration: {
        fast: '100ms',
        DEFAULT: '150ms',
        slow: '250ms',
      },
    },
  },
  plugins: [],
}

export default config
