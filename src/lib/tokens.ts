// src/lib/tokens.ts
// Exported only for cases where a JS value is needed (e.g. inline styles in
// dynamic server components). Prefer CSS variables via Tailwind arbitrary
// values for everything else.

export const COLORS = {
  bgCanvas: "#09090b",
  bgSurface: "#18181b",
  bgElevated: "#27272a",
  borderSubtle: "rgba(255,255,255,0.06)",
  borderDefault: "rgba(255,255,255,0.1)",
  textPrimary: "#fafafa",
  textSecondary: "#a1a1aa",
  textTertiary: "#71717a",
  accentPrimary: "#ff4655",
  accentGlow: "rgba(255,70,85,0.12)",
  statusWin: "#10b981",
  statusLoss: "#f43f5e",
} as const;

export const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
