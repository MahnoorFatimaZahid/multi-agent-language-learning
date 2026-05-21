/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sora)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        ink:          "#0A0F1C",
        paper:        "#F5F3EE",
        cream:        "#EDE9E0",
        accent:       "#1A56DB",
        "accent-soft":"#EFF3FF",
        "accent-hover":"#1443B5",
        muted:        "#6B7280",
        border:       "#E4E0D8",
        success:      "#059669",
        warning:      "#D97706",
        danger:       "#DC2626",
      },
      animation: {
        spotlight: "spotlight 2s ease .75s 1 forwards",
        shimmer:   "shimmer 2s linear infinite",
        float:     "float 3s ease-in-out infinite",
      },
      keyframes: {
        spotlight: {
          "0%":   { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: "1", transform: "translate(-50%, -40%) scale(1)" },
        },
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to:   { backgroundPosition: "-200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-10px)" },
        },
      },
    },
  },
  plugins: [],
};