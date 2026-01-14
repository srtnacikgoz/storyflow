/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#a4d1e8",
          yellow: "#e7c57d",
          mustard: "#d4a945",
          green: "#a4d4bc",
          peach: "#f3d1c8",
          orange: "#e59a77",
        },
      },
      borderRadius: {
        "4xl": "32px",
      },
    },
  },
  plugins: [],
}

