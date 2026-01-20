/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./LandingPage.jsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        // Treat smaller laptops (≈13–14") as "tablet" layouts.
        // Use `desk:` when you truly want desktop-only UI.
        // Screen inches don't map to responsive breakpoints; CSS viewport width does.
        // Many 13.6" laptops end up around ~1200–1280px usable width depending on zoom/UI.
        desk: "1200px",
      },
      width: {
        '30': '4rem',
        '35': '5rem',
        '40': '6rem',
      },
      height: {
        '23': '5.75rem',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Caveat', 'cursive'],
      },
      colors: {
        primary: 'oklch(60% .118 184.704)',
        secondary: 'oklch(39.8% .07 227.392)',
        accent: 'oklch(82.8% .189 84.429)',
        highlight: 'oklch(76.9% .188 70.08)',
        neutral: 'oklch(98.4% .003 247.858)',
      },
      animation: {
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'float-slow': 'float 20s ease-in-out infinite',
        'float-medium': 'float 15s ease-in-out infinite',
        'float-fast': 'float 10s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'gradient-xy': {
          '0%, 100%': { 'background-size': '400% 400%', 'background-position': 'left center' },
          '50%': { 'background-size': '200% 200%', 'background-position': 'right center' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)', opacity: '0.7' },
          '25%': { transform: 'translateY(-20px) translateX(10px)', opacity: '1' },
          '50%': { transform: 'translateY(-10px) translateX(-5px)', opacity: '0.8' },
          '75%': { transform: 'translateY(-25px) translateX(-10px)', opacity: '0.9' },
        },
      },
    },
  },
  plugins: [],
};

