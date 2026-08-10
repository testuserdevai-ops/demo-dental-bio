import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic UI tokens. Values stay in app/globals.css so white-label routes
        // can override the token layer without a palette conversion.
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        "destructive-foreground": "var(--destructive-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        disabled: "var(--disabled)",
        placeholder: "var(--placeholder)",
        success: "var(--success)",
        warning: "var(--warning)",
        info: "var(--info)",
        dark: "#1d1d1d",
        "primary-1": "#5046db",
        "primary-2": "#7267e3",
        "primary-3": "#9488eb",
        "primary-4": "#b6adf3",
        "primary-5": "#d8d3fa",
        "primary-orange-1": "#ef753a",
        "primary-orange-2": "#fd8516",
        "primary-green-1": "#34d594",

        // Overlay colors
        overlay: "rgba(0, 0, 0, 0.5)",
        "overlay-dark": "rgba(0, 0, 0, 0.56)",

        // Surface / background colors
        surface: "#F3F3F1",
        "surface-light": "#f7fafc",
        "surface-muted": "#f1f1f1",
        "surface-alt": "#f1f1f3",

        // Gradient colors (auth pages)
        "gradient-purple": "#8866e9",
        "gradient-coral": "#cb7470",
        "gradient-orange": "#ed8b39",

        // Button gradient colors
        "btn-gradient-rose": "#d47e8b",
        "btn-gradient-peach": "#e09f7e",
        "btn-gradient-terracotta": "#DE8A6D",
        "btn-gradient-rust": "#c46a4c",

        // Deep purple (CTA/save buttons)
        "deep-purple": "#302A83",

        // Accent purples
        "accent-purple": "#7d71e5",
        "accent-purple-light": "#7977ED",

        // Accent blues
        "accent-blue": "#49ADF4",
        "accent-blue-light": "#86B7FE",
        "accent-blue-muted": "#c8dff6",

        // Accent warm colors
        "accent-gold": "#FFD700",
        "accent-coral": "#d46466",
        "accent-orange": "#E97348",
        "accent-amber": "#e7b274",

        // Claim form gradient
        "claim-rose": "#e1768b",
        "claim-salmon": "#e78f82",
        "claim-gold": "#f5be5d",

        // Gray scale
        "gray-text": "#9D9D9D",
        "gray-muted": "#9CA3AF",
        "gray-border": "#E5E7EB",
        "gray-light-border": "#ddd",
        "gray-placeholder": "#BBB",
        "gray-mid": "#8d8d8d",
        "gray-dark-text": "#4b5563",
        "gray-input": "#989898",

        // Dark text / input colors
        "dark-text": "#121822",
        "dark-text-alpha": "rgba(18, 24, 34, 0.91)",

        // Sidebar
        "sidebar-border": "#e8edf2",

        // Discord-like colors
        "discord-bg": "#2B2D31",
        "discord-dark": "#1c1c21",
        "discord-text": "#313338",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeOut: {
          "0%": { opacity: "1", display: "flex" },
          "100%": { opacity: "0", display: "none" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in forwards",
        "fade-out": "fadeOut 0.3s ease-out forwards",
        "fade-in-short": "fadeIn 0.1s ease-in forwards",
        "fade-out-short": "fadeOut 0.1s ease-out forwards",
      },
    },
    screens: {
      xs: "380px",
      xsm: "425px",
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xxl: "1200px",
      xl: "1280px",
      "2xl": "1536px",
    },
  },
  plugins: [],
};
export default config;
