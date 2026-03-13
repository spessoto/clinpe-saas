import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/lib/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#0D9488",
          hover: "#0F766E",
        },
        secondary: {
          DEFAULT: "#1E3A8A",
          hover: "#1E40AF",
        },
        background: "#F8FAFC",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        text: {
          primary: "#334155",
          muted: "#64748B",
        },
        destructive: "#E11D48",
        warning: "#F97316",
        success: "#10B981",
      },
    },
  },
};

export default config;
