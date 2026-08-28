import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7EB338',
          accent: '#7EB338',
          secondary: '#F08C38',
          cream: '#F5EFE0',
          dark: '#2D3748',
          muted: '#718096',
          border: '#E2E8F0',
          light: '#F5EFE0',
        },
        slate: {
          850: '#1e293b',
        }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      fontWeight: {
        bold: '700',
        semibold: '600',
        extrabold: '800',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
export default config

