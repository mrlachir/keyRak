import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          50: "#fcf6f2",
          100: "#f7e8de",
          200: "#efd0bd",
          300: "#e3ad8f",
          400: "#d3825e",
          500: "#bd613d",
          600: "#a64b31",
          700: "#873b2a",
          800: "#6e3227",
          900: "#5b2b23",
          950: "#31140f",
        },
        majorelle: {
          50: "#f0f4ff",
          100: "#e2e9ff",
          200: "#c9d5ff",
          300: "#a5b7ff",
          400: "#7b8df8",
          500: "#5c67ec",
          600: "#4749d8",
          700: "#3c3aae",
          800: "#33358c",
          900: "#2f3270",
          950: "#1c1d41",
        },
        olive: {
          50: "#f7f8ee",
          100: "#ecefd8",
          200: "#d9dfb5",
          300: "#bdc987",
          400: "#9eae5f",
          500: "#7f913f",
          600: "#637331",
          700: "#4d5929",
          800: "#404a26",
          900: "#373f23",
          950: "#1c2210",
        },
        sand: {
          50: "#fdfbf7",
          100: "#f8f2e8",
          200: "#efe3d0",
          300: "#e5cfb1",
          400: "#d8b68c",
          500: "#ca9d6c",
          600: "#b78351",
          700: "#98673f",
          800: "#7d5538",
          900: "#664831",
          950: "#372418",
        },
        ink: "#201b18",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: {
        arch: "10rem 10rem 1.5rem 1.5rem",
      },
      backgroundImage: {
        zellige:
          "linear-gradient(45deg, rgba(71,73,216,.055) 25%, transparent 25%), linear-gradient(-45deg, rgba(71,73,216,.055) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(189,97,61,.05) 75%), linear-gradient(-45deg, transparent 75%, rgba(189,97,61,.05) 75%)",
        "hero-glow":
          "radial-gradient(circle at 20% 20%, rgba(211,130,94,.28), transparent 38%), radial-gradient(circle at 82% 30%, rgba(71,73,216,.16), transparent 34%)",
      },
      backgroundSize: {
        zellige: "28px 28px",
      },
      boxShadow: {
        card: "0 20px 55px -32px rgba(49,20,15,.38)",
        float: "0 24px 70px -30px rgba(28,29,65,.42)",
      },
    },
  },
  plugins: [],
};

export default config;
