/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        serif: ["var(--font-serif)", "DM Serif Display", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        brand: {
          cyan: "#00d4ff",
          purple: "#7b2ff7",
          dark: "#020203",
          card: "#0a0a0c",
        },
        primary: "var(--primary)",
        "primary-container": "var(--primary-container)",
        "on-primary-container": "var(--on-primary-container)",
        secondary: "var(--secondary)",
        "secondary-container": "var(--secondary-container)",
        "on-secondary-container": "var(--on-secondary-container)",
        tertiary: "var(--tertiary)",
        "tertiary-container": "var(--tertiary-container)",
        "on-tertiary-container": "var(--on-tertiary-container)",
        "tertiary-fixed": "var(--tertiary-fixed)",
        background: "var(--bg)",
        surface: "var(--surface)",
        "surface-container": "var(--surface-container)",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "on-surface": "var(--text-primary)",
        "on-background": "var(--text-primary)",
        "outline-variant": "var(--border)",
        outline: "var(--text-muted)",
      }
    },
  },
  plugins: [],
}

