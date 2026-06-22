/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0c2a45', light: '#11243b' },
        accent: { DEFAULT: '#0e6b86', dark: '#0a526b' },
        bg: '#eef3f9',
      },
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Libre Franklin"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
