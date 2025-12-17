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
          DEFAULT: '#344F1F',
          dark: '#2A3E17',
          light: '#F2EAD3',
          accent: '#F4991A',
        }
      }
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
export default config
