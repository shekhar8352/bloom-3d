/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Fraunces', 'Iowan Old Style', 'Palatino', 'Georgia', 'serif'],
        sans: ['Outfit', 'Avenir Next', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        ink: '#241c18',
        clay: '#8a4034',
      },
    },
  },
  plugins: [],
}
