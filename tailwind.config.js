import forms from '@tailwindcss/forms';

export default {
  darkMode: 'class', // Enable dark mode using class strategy
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "node_modules/preline/dist/*.js",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          primary: '#1f2937',
          secondary: '#111827',
          text: '#f3f4f6',
          'text-muted': '#9ca3af',
        },
        // Add custom colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      // Add transition properties
      transitionProperty: {
        'colors': 'background-color, border-color, color, fill, stroke',
        'opacity': 'opacity',
        'shadow': 'box-shadow',
        'transform': 'transform',
      },
    },
  },
  plugins: [
    forms,
    require('preline/plugin'),
  ],
};
