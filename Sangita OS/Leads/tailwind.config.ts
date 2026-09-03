import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "hsl(var(--panel))",
        panel2: "hsl(var(--panel-2))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        accent: "hsl(var(--accent))",
      },
      boxShadow: {
        soft: "0 12px 30px rgba(2, 6, 23, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
