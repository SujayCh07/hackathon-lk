/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        teal: "#0D3B66",
        turquoise: "#2EC4B6",
        sand: "#F4D35E",
        coral: "#EE6C4D",
        offwhite: "#FAF9F6",
        charcoal: "#2B2B2B"
      },
      fontFamily: {
        poppins: ['"Poppins"', 'sans-serif'],
        inter: ['"Inter"', 'sans-serif']
      }
    }
  },
  plugins: []
};
