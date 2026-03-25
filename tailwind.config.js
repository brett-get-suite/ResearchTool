/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8eccff',
          400: '#59afff',
          500: '#338dff',
          600: '#1a6df5',
          700: '#1357e1',
          800: '#1647b6',
          900: '#183f8f',
          950: '#142857',
        },
        surface: {
          0: '#0a0e17',
          50: '#0f1520',
          100: '#151c2b',
          200: '#1c2537',
          300: '#253043',
          400: '#2f3d52',
          500: '#3d4d65',
          600: '#556b87',
          700: '#7a93b2',
          800: '#a3b5cc',
          900: '#c9d5e3',
          950: '#e8edf4',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
