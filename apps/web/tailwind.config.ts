import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary blue theme - dark navy blue
        primary: {
          50: '#e6e6f0',
          100: '#ccccdd',
          200: '#9999bb',
          300: '#666699',
          400: '#333377',
          500: '#00002E', // Main dark blue
          600: '#000026',
          700: '#00001e',
          800: '#000016',
          900: '#00000e',
        },
        // Bright theme colors
        dark: {
          50: '#ffffff',
          100: '#f9fafb',
          200: '#f3f4f6',
          300: '#e5e7eb',
          400: '#d1d5db',
          500: '#9ca3af',
          600: '#6b7280',
          700: '#4b5563',
          800: '#374151',
          900: '#1f2937',
          950: '#111827',
        },
        // Accent colors
        accent: {
          blue: '#00002E',
          darkBlue: '#00002E',
          sky: '#3B82F6',
          white: '#FFFFFF',
          black: '#0A0A0A',
          gray: '#1A1A1A',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #00002E 0%, #1a1a3a 50%, #2d2d4d 100%)',
        'card-gradient': 'linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(249, 250, 251, 1) 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'blue-glow': '0 0 30px rgba(0, 0, 46, 0.2)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
