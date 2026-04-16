/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: { navy: '#1A1F3D', teal: '#0D9488', gold: '#D4A017' },
      fontFamily: { arabic: ['Cairo', 'Arial', 'sans-serif'] },
    },
  },
  plugins: [],
};
