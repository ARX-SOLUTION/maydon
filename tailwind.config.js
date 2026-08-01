/** Tailwind v3 config — ported from the old in-<head> CDN config in layout.tsx.
 * Build a static stylesheet (no in-browser compiler) with:
 *   deno task build:css
 * Scans .tsx/.ts as plain text, so class tokens inside raw`…` template strings
 * and JS string literals (e.g. "!bg-crm-danger") are picked up too.
 */
export default {
  content: ["./src/**/*.tsx", "./src/**/*.ts"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        crm: {
          bg: "var(--bg-color)",
          surface: "var(--section-bg-color)",
          surfaceSoft: "var(--secondary-bg-color)",
          primary: "var(--button-color)",
          primarySoft: "rgba(37, 99, 235, 0.12)",
          onPrimary: "var(--button-text-color)",
          secondary: "var(--button-color)",
          success: "#34C759",
          successSoft: "rgba(52, 199, 89, 0.12)",
          warning: "#FF9500",
          warningSoft: "rgba(255, 149, 0, 0.12)",
          danger: "#FF3B30",
          dangerSoft: "rgba(255, 59, 48, 0.12)",
          textMain: "var(--text-color)",
          textMuted: "var(--subtitle-text-color)",
          borderSoft: "var(--border-color)",
          muted: "var(--hint-color)",
          header: "var(--header-bg-color)",
        },
      },
      boxShadow: {
        soft: "0px 2px 8px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.02)",
        softHover: "0px 4px 16px rgba(0, 0, 0, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.04)",
        floating: "0px 8px 32px rgba(0, 0, 0, 0.12), 0px 4px 8px rgba(0, 0, 0, 0.06)",
        glass: "0px 8px 32px rgba(0, 0, 0, 0.08)",
        card: "0px 2px 12px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        "r-xs": "var(--r-xs)", // 10px
        "r-sm": "var(--r-sm)", // 14px
        "r-md": "var(--r-md)", // 20px
        "r-lg": "var(--r-lg)", // 28px
        "r-xl": "var(--r-xl)", // 34px
        "4xl": "24px",
        "3xl": "20px",
        "2xl": "16px",
        "xl": "14px",
        "lg": "12px",
      },
      zIndex: {
        60: "60",
        70: "70",
      },
    },
  },
};
