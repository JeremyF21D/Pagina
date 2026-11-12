/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        figma: {
          bg: '#000000',
          card: '#1c1d22',
          cardHover: '#23252c',
          sidebar: '#1d1e23',
          border: '#2d2f35',
          borderLight: 'rgba(255, 255, 255, 0.08)',
          red: '#de2420',
          redHover: '#c81e1a',
        },
        brand: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#de2420',
          600: '#c81e1a',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a'
        },
        whatsapp: {
          light: '#25D366',
          dark: '#075E54',
          teal: '#128C7E',
          chatbg: '#EFEAE2',
          outgoing: '#D9FDD3',
          border: '#E2E8F0'
        }
      }
    },
  },
  plugins: [],
}
