import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#E1F5EE", 100: "#9FE1CB", 500: "#1D9E75", 700: "#0F6E56", 900: "#04342C" },
        navy: { 50: "#E8EAF6", 500: "#1A1F3D", 700: "#12152B", 900: "#0A0D1A" },
      },
      fontFamily: { sans: ["Inter", "Noto Sans Arabic", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
