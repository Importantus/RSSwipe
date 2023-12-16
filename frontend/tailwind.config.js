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
      'text-detail': ['Inter'],
    },
    extend: {
      colors: {
        'primary': {
          '50': '#fcf7f0',
          '100': '#f8eddc',
          '200': '#f1d7b7',
          '300': '#e8bc89',
          '400': '#dd975a',
          '500': '#d67c39',
          '600': '#cf6a31',
          '700': '#a64f28',
          '800': '#854127',
          '900': '#6c3622',
          '950': '#3a1a10',
        },
        'secondary': {
          '50': '#f6f6f6',
          '100': '#e7e7e7',
          '200': '#d1d1d1',
          '300': '#b0b0b0',
          '400': '#888888',
          '500': '#6d6d6d',
          '600': '#5d5d5d',
          '700': '#4f4f4f',
          '800': '#454545',
          '900': '#353535',
          '950': '#262626',
        },
        'background': {
          '50': '#f6f6f6',
          '100': '#e7e7e7',
          '200': '#d1d1d1',
          '300': '#b0b0b0',
          '400': '#888888',
          '500': '#6d6d6d',
          '600': '#5d5d5d',
          '700': '#4f4f4f',
          '800': '#454545',
          '900': '#3d3d3d',
          '950': '#101010',
        },
        'tertiary': {
          '50': '#f7f7f7',
          '100': '#ededed',
          '200': '#d9d9d9',
          '300': '#c8c8c8',
          '400': '#adadad',
          '500': '#999999',
          '600': '#888888',
          '700': '#7b7b7b',
          '800': '#676767',
          '900': '#545454',
          '950': '#363636',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}

