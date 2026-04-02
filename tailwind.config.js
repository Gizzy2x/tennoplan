/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warframe faction palette
        'cetus-gold':  '#f0ad4e',
        'vallis-blue': '#00ffff',
        'void-green':  '#2ecc71',
        'deep-bg':     '#0a0a0b',
      },
    },
  },
  plugins: [],
};
