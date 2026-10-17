/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        DEFAULT: '3px',
        sm: '3px',
        md: '3px',
        lg: '3px',
        xl: '3px',
      },
      colors: {
        border: '#e2e8f0', // off-white thin border
        'border-card': '#e5e7eb',
        primary: {
          DEFAULT: '#16a34a', // Greenfield grocers accent green
          hover: '#15803d',
          dark: '#14532d',
          light: '#f0fdf4'
        },
        amberBox: '#d97706',
        greenBox: '#16a34a'
      }
    },
  },
  plugins: [],
};
