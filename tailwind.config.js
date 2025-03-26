/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        success: '#27AE60',
        warning: '#F39C12',
        background: '#F5F5F5'
      }
    },
  },
  plugins: [],
};