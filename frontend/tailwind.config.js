/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Caveat', 'cursive'],
      },
      colors: {
        'primary': 'oklch(60% .118 184.704)',
        'secondary': 'oklch(39.8% .07 227.392)',
        'accent': 'oklch(82.8% .189 84.429)',
        'highlight': 'oklch(76.9% .188 70.08)',
        'neutral': 'oklch(98.4% .003 247.858)',
      },
      animation: {
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'float-slow': 'float 20s ease-in-out infinite',
        'float-medium': 'float 15s ease-in-out infinite',
        'float-fast': 'float 10s ease-in-out infinite',
      },
      keyframes: {
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px) translateX(0px)',
            opacity: '0.7'
          },
          '25%': {
            transform: 'translateY(-20px) translateX(10px)',
            opacity: '1'
          },
          '50%': {
            transform: 'translateY(-10px) translateX(-5px)',
            opacity: '0.8'
          },
          '75%': {
            transform: 'translateY(-25px) translateX(-10px)',
            opacity: '0.9'
          }
        }
      },
    },
  },
  plugins: [],
}
