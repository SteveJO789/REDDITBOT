import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        steel: "#5f6b7a",
        line: "#d9e0e8",
        panel: "#f7f9fb"
      }
    }
  },
  plugins: []
};

export default config;
