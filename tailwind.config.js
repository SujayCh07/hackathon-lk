/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: "#002878",
        sky: "#1D4ED8",
        red: "#D0312D",
        blush: "#F6E9E7",
        mist: "#F4F5F7",
        slate: "#1F2933",
        offwhite: "#FAF9F6",
        teal: "#0D3B66",
        turquoise: "#2EC4B6",
        sand: "#F4D35E",
        coral: "#EE6C4D",
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
