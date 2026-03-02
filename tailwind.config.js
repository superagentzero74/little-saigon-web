/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ls: {
          primary: "#242424",
          secondary: "#757575",
          surface: "#F2F2F2",
          border: "#F2F2F2",
          body: "#444444",
          heart: "#E53E3E",
          caption: "#757575",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        "page-title": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "section-header": ["18px", { lineHeight: "1.3", fontWeight: "700" }],
        "card-title": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.5", fontWeight: "400" }],
        meta: ["13px", { lineHeight: "1.4", fontWeight: "500" }],
        tag: ["12px", { lineHeight: "1.3", fontWeight: "500" }],
        "nav-label": ["11px", { lineHeight: "1.2", fontWeight: "500" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      borderRadius: {
        card: "12px",
        pill: "20px",
        btn: "8px",
        badge: "12px",
      },
    },
  },
  plugins: [],
};
