/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/**/*.html',
    './src/**/*.{js,jsx,ts,tsx,vue}',
  ],
  theme: {
    fontFamily: {
      'title': ['Merriweather'],
      'text': ['Merriweather Sans'],
      'text-small': ['Inter'],
      'Merriweather Sans': ['Merriweather Sans', 'sans-serif'],
    },
    extend: {
      colors: {
        'primary': '#CF6A31',
        'secondary': '#282828',
        'background': '#0A0A0A',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}

