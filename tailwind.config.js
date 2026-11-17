/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50, #f0f7ff)',
          100: 'var(--color-primary-100, #e0effe)',
          200: 'var(--color-primary-200, #bae0fd)',
          300: 'var(--color-primary-300, #7cc5fb)',
          400: 'var(--color-primary-400, #36a7f7)',
          500: 'var(--color-primary-500, #0c8ce9)',
          600: 'var(--color-primary-600, #026fc7)',
          700: 'var(--color-primary-700, #0358a1)',
          800: 'var(--color-primary-800, #074b85)',
          900: 'var(--color-primary-900, #0c3f6e)',
          950: 'var(--color-primary-950, #082849)',
        },
        mac: {
          sidebar: {
            light: 'rgba(246, 246, 247, 0.85)',
            dark: 'rgba(30, 30, 32, 0.85)',
          },
          window: {
            light: 'rgba(255, 255, 255, 0.85)',
            dark: 'rgba(24, 24, 27, 0.85)',
          },
          border: {
            light: 'rgba(0, 0, 0, 0.08)',
            dark: 'rgba(255, 255, 255, 0.1)',
          },
          toolbar: {
            light: 'rgba(250, 250, 252, 0.9)',
            dark: 'rgba(38, 38, 42, 0.9)',
          }
        }
      },
      borderRadius: {
        'mac': '10px',
        'mac-lg': '14px',
        'mac-xl': '18px',
      },
      boxShadow: {
        'mac-window': '0 20px 40px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        'mac-window-dark': '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        'mac-card': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'mac-card-dark': '0 2px 8px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(255, 255, 255, 0.05)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Icons"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
