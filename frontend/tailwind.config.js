/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "rgb(var(--cream-rgb) / <alpha-value>)",
        lavender: "rgb(var(--lavender-rgb) / <alpha-value>)",
        purple: { DEFAULT: "rgb(var(--purple-rgb) / <alpha-value>)", deep: "rgb(var(--purple-deep-rgb) / <alpha-value>)" },
        corgi: "rgb(var(--corgi-rgb) / <alpha-value>)",
        gold: "rgb(var(--gold-rgb) / <alpha-value>)",
        ink: "rgb(var(--text-rgb) / <alpha-value>)",
        muted: { DEFAULT: "rgb(var(--muted-rgb) / <alpha-value>)", strong: "rgb(var(--muted-strong-rgb) / <alpha-value>)" },
        "user-message": "rgb(var(--user-message-rgb) / <alpha-value>)",
        "assistant-message": "rgb(var(--assistant-message-rgb) / <alpha-value>)",
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', "Pretendard", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 24px -12px rgba(109, 75, 195, 0.25)",
        card: "0 12px 32px -16px rgba(64, 56, 79, 0.25)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
