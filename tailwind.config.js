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
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        crm: {
          bg: "#F8FAFC",
          surface: "#FFFFFF",
          surfaceSoft: "#F1F5FD",
          primary: "#2563EB",
          primarySoft: "#DBEAFE",
          onPrimary: "#0F172A",
          secondary: "#3B82F6",
          accent: "#059669",
          success: "#16A34A",
          successSoft: "#DCFCE7",
          warning: "#D97706",
          warningSoft: "#FEF3C7",
          danger: "#DC2626",
          dangerSoft: "#FEE2E2",
          textMain: "#0F172A",
          textMuted: "#64748B",
          borderSoft: "#E4ECFC",
          muted: "#F1F5F9",
        },
      },
      boxShadow: {
        soft:
          "0 0 0 1px rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.08), 0 14px 32px rgba(37, 99, 235, 0.08)",
        softHover:
          "0 0 0 1px rgba(37, 99, 235, 0.14), 0 8px 22px rgba(37, 99, 235, 0.12)",
        floating: "0 12px 28px rgba(37, 99, 235, 0.20)",
        glass: "0 4px 30px rgba(15, 23, 42, 0.07)",
      },
      borderRadius: {
        "4xl": "24px",
        "3xl": "18px",
        "2xl": "16px",
      },
      zIndex: {
        60: "60",
        70: "70",
      },
    },
  },
};
