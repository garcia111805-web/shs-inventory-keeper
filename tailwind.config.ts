import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Playfair Display"', 'serif'],
        body: ['"Outfit"', 'sans-serif'],
      },
      colors: {
        navy: '#0d1b6e',
        gold: '#e8b400',
        'brand-red': '#b71c1c',
        'stock-green': '#15803d',
        'stock-amber': '#d97706',
        'stock-red': '#b91c1c',
        'restock-blue': '#1d4ed8',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
