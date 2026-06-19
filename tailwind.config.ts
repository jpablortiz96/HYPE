import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0E13",
        panel: "#10141C",
        panel2: "#151A24",
        line: "#1E2532",
        amber: "#FFB300",
        amberdim: "#A87708",
        paper: "#EAE6DA",
        mut: "#8B93A3",
        up: "#2CE08B",
        down: "#FF4D6D",
      },
      fontFamily: {
        display: ["Unbounded", "system-ui", "sans-serif"],
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        tape: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        pulseamber: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        tape: "tape 40s linear infinite",
        pulseamber: "pulseamber 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
