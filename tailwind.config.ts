import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hijau daun — warna utama, merujuk sayuran pecel & kesan "operasional lapangan"
        forest: {
          50: "#f2f6f0",
          100: "#dfe9d8",
          400: "#5c8a4d",
          600: "#3c6631",
          700: "#2f5233",
          900: "#1c3320",
        },
        // Kuning kunyit/gula merah — aksen sekunder, hangat, bukan default terracotta
        turmeric: {
          50: "#fdf6e3",
          400: "#e0ad2f",
          600: "#b8871a",
        },
        // Status kanban — palet konsisten dipakai di seluruh app
        status: {
          scheduling: "#94a3b8",
          assigned: "#3b82f6",
          picking: "#a855f7",
          delivery: "#e0ad2f",
          arrived: "#0ea5e9",
          visited: "#14b8a6",
          completed: "#3c6631",
          cancelled: "#ef4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
