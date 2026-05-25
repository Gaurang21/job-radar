import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        signal: {
          bg: "#030712",
          surface: "#0c1527",
          card: "#111827",
          "card-hover": "#1a2540",
          border: "rgba(255,255,255,0.08)",
          "border-glow": "rgba(6,182,212,0.4)",
          cyan: "#06b6d4",
          "cyan-glow": "rgba(6,182,212,0.25)",
          violet: "#818cf8",
          "violet-glow": "rgba(129,140,248,0.25)",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
          muted: "#6b7280",
          "muted-text": "#9ca3af",
        },
      },
      backgroundImage: {
        "signal-gradient": "radial-gradient(ellipse at 20% 50%, rgba(6,182,212,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(129,140,248,0.08) 0%, transparent 60%)",
        "card-gradient": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        "score-green": "linear-gradient(135deg, #10b981, #059669)",
        "score-yellow": "linear-gradient(135deg, #f59e0b, #d97706)",
        "score-red": "linear-gradient(135deg, #ef4444, #dc2626)",
      },
      boxShadow: {
        "signal": "0 0 40px rgba(6,182,212,0.15), 0 4px 24px rgba(0,0,0,0.4)",
        "signal-lg": "0 0 60px rgba(6,182,212,0.2), 0 8px 32px rgba(0,0,0,0.5)",
        "glow-cyan": "0 0 20px rgba(6,182,212,0.5)",
        "glow-violet": "0 0 20px rgba(129,140,248,0.5)",
        "card": "0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.3)",
        "card-hover": "0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(6,182,212,0.1)",
      },
      animation: {
        "radar-sweep": "radar-sweep 3s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-up": "fade-up 0.4s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-right": "slide-right 0.3s ease-out",
        "score-fill": "score-fill 1s ease-out",
      },
      keyframes: {
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-right": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "score-fill": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "var(--target-offset)" },
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "Menlo", "monospace"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
