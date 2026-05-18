import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        steel: "#5f6b7a",
        line: "#d6dde6",
        panel: "#f6f8fb",
        canvas: "#eef1f4",
        night: "#111827",
        signal: "#0f766e",
        caution: "#b45309",
        danger: "#be123c",
        violet: "#6d28d9"
      },
      boxShadow: {
        panel: "0 8px 24px rgba(17, 24, 39, 0.07)",
        tight: "0 1px 0 rgba(17, 24, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
