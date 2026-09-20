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
        // Redesign "Pulsar" — ungu sebagai aksen utama, menggantikan hijau
        // daun sebelumnya. Nama kunci "forest"/"turmeric" dipertahankan apa
        // adanya supaya seluruh className (bg-forest-700, text-forest-600,
        // dst.) di semua halaman otomatis ikut berganti warna tanpa perlu
        // menyentuh tiap file satu per satu.
        forest: {
          50: "#f2effe",
          100: "#e4defb",
          400: "#9c85f5",
          600: "#4930d1",
          700: "#5b3df0",
          900: "#1c1440",
        },
        turmeric: {
          50: "#fdf3e0",
          400: "#f5b83f",
          600: "#cf8a0a",
          700: "#f2a30f",
        },
        // Warna status Kanban — dipertahankan, sudah selaras dengan palet Pulsar
        status: {
          scheduling: "#94a3b8",
          assigned: "#3b82f6",
          picking: "#a855f7",
          delivery: "#f2a30f",
          arrived: "#0ea5e9",
          visited: "#14b8a6",
          completed: "#17c98d",
          cancelled: "#e0264a",
        },
        // Token Pulsar mentah — dipakai di komponen yang ditulis ulang
        // (Sidebar, Header, Rail, BottomTabs, Login, dll.)
        accent: {
          DEFAULT: "#5b3df0",
          hover: "#4930d1",
        },
        ink: {
          DEFAULT: "#14141c",
          muted: "#5c5c70",
        },
        surface: {
          page: "#f7f7fb",
          raised: "#ffffff",
        },
        border: {
          DEFAULT: "#e3e4ec",
          strong: "#cfd0dc",
        },
        success: "#17c98d",
        warning: "#f2a30f",
        danger: "#e0264a",
      },
      borderRadius: {
        sm: "8px",
        md: "14px",
        lg: "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(20, 20, 28, 0.06)",
        md: "0 8px 24px rgba(20, 20, 28, 0.10)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
