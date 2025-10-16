import type { Config } from "tailwindcss";
import 'flowbite';

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#1d1d1d",
        "primary-1": "#5046db",
        "primary-2": "#7267e3",
        "primary-3": "#9488eb",
        "primary-4": "#b6adf3",
        "primary-5": "#d8d3fa",
        "primary-orange-1": "#ef753a",
        "primary-orange-2": "#fd8516",
        "primary-green-1": "#34d594",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1', display: 'flex' },
          '100%': { opacity: '0', display: 'none' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in forwards',
        'fade-out': 'fadeOut 0.3s ease-out forwards',
        'fade-in-short': 'fadeIn 0.1s ease-in forwards',
        'fade-out-short': 'fadeOut 0.1s ease-out forwards',
      },
    },
    screens: {
      'xs': '380px',
      'xsm': '425px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xxl': '1200px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
  plugins: [],
};
export default config;
