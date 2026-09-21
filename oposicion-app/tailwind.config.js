/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2C5F8A',
          50: '#E8F0F6',
          100: '#D1E1ED',
          200: '#A3C3DB',
          700: '#234C6E',
          800: '#1A3A54',
          900: '#12283B',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
