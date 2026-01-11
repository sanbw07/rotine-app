/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brown: {
          50: '#fbf7f6',
          100: '#f6ede9',
          200: '#ebdccf',
          300: '#dec3a9',
          400: '#ce9f7c',
          500: '#b47d52',
          600: '#96613b',
          700: '#794b2f',
          800: '#633e2b',
          900: '#513426',
          950: '#2c1b14',
        }
      }
    },
  },
  plugins: [],
}