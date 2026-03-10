/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        desk: '1200px',
      },
      width: {
        '30': '4rem',   // 64px - reduced from 120px to match previous appearance
        '35': '5rem',   // 80px
        '40': '6rem',   // 96px
      },
      height: {
        '23': '5.75rem', // 92px - for header consistency
      },
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
        'spin-slow': 'spin 3s linear infinite',
        'glitch-after': 'glitch var(--after-duration) infinite linear alternate-reverse',
        'glitch-before': 'glitch var(--before-duration) infinite linear alternate-reverse',
      },
      keyframes: {
        glitch: {
          '0%': { clipPath: 'inset(20% 0 50% 0)' },
          '5%': { clipPath: 'inset(10% 0 60% 0)' },
          '10%': { clipPath: 'inset(15% 0 55% 0)' },
          '15%': { clipPath: 'inset(25% 0 35% 0)' },
          '20%': { clipPath: 'inset(30% 0 40% 0)' },
          '25%': { clipPath: 'inset(40% 0 20% 0)' },
          '30%': { clipPath: 'inset(10% 0 60% 0)' },
          '35%': { clipPath: 'inset(15% 0 55% 0)' },
          '40%': { clipPath: 'inset(25% 0 35% 0)' },
          '45%': { clipPath: 'inset(30% 0 40% 0)' },
          '50%': { clipPath: 'inset(20% 0 50% 0)' },
          '55%': { clipPath: 'inset(10% 0 60% 0)' },
          '60%': { clipPath: 'inset(15% 0 55% 0)' },
          '65%': { clipPath: 'inset(25% 0 35% 0)' },
          '70%': { clipPath: 'inset(30% 0 40% 0)' },
          '75%': { clipPath: 'inset(40% 0 20% 0)' },
          '80%': { clipPath: 'inset(20% 0 50% 0)' },
          '85%': { clipPath: 'inset(10% 0 60% 0)' },
          '90%': { clipPath: 'inset(15% 0 55% 0)' },
          '95%': { clipPath: 'inset(25% 0 35% 0)' },
          '100%': { clipPath: 'inset(30% 0 40% 0)' },
        },
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
