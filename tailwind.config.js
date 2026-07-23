/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(216 5% 88%)",
        input: "hsl(216 5% 88%)",
        ring: "hsl(215 25% 30%)",
        background: "hsl(220 15% 96%)",
        foreground: "hsl(220 10% 10%)",
        primary: {
          DEFAULT: "hsl(215 80% 45%)",
          foreground: "hsl(0 0% 100%)",
        },
        secondary: {
          DEFAULT: "hsl(215 20% 92%)",
          foreground: "hsl(215 40% 25%)",
        },
        muted: {
          DEFAULT: "hsl(215 15% 92%)",
          foreground: "hsl(215 10% 50%)",
        },
        accent: {
          DEFAULT: "hsl(215 80% 45%)",
          foreground: "hsl(215 40% 25%)",
        },
        destructive: {
          DEFAULT: "hsl(0 75% 50%)",
          foreground: "hsl(0 0% 100%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(220 10% 10%)",
        },
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(220 10% 10%)",
        },
        green: {
          DEFAULT: "hsl(142 60% 38%)",
          bg: "hsl(142 60% 95%)",
        },
        amber: {
          DEFAULT: "hsl(32 90% 45%)",
          bg: "hsl(32 90% 94%)",
        },
        red: {
          DEFAULT: "hsl(0 75% 50%)",
          bg: "hsl(0 75% 95%)",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};
