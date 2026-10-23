// ─── "Quiet Ink" semantic palette ─────────────────────────────────────────────
// Static, deterministic LIGHT values (app is light-only this pass — see
// app.json userInterfaceStyle). Monochrome ink accent: colour is reserved for
// status semantics, never decoration. Never hardcode hexes in screens.

// Brand / accent — near-black ink (#101012 on #FFFFFF = 18.9:1, WCAG AAA)
export const colors = {
  // Core ink (brand + primary label share one value for total consistency)
  ink: "#101012",
  inkSoft: "#3F3F46", // secondary emphasis on ink surfaces, pressed ink
  onInk: "#FFFFFF",
  inkSubtle: "#ECECEF", // ~7% ink tint — chip/pill backgrounds

  // Text
  label: "#101012",
  secondaryLabel: "#52525B", // 7.4:1 on white
  tertiaryLabel: "#8E8E96", // hints, placeholders, disabled

  // Backgrounds (layered, cool-neutral)
  systemBackground: "#FFFFFF",
  secondaryBackground: "#F6F6F7",
  tertiaryBackground: "#EFEFF1",

  // Separator / divider
  separator: "#E7E7EA",

  // Status semantics (the only saturated colours in the app)
  success: "#059669",
  successSubtle: "#D1FAE5",
  warning: "#B45309", // AA on warningSubtle
  warningSubtle: "#FEF3C7",
  danger: "#DC2626",
  dangerSubtle: "#FEE2E2",
  info: "#2563EB",
  infoSubtle: "#DBEAFE",

  // Always-fixed values (do not adapt to theme)
  onTint: "#FFFFFF",
  alwaysBlack: "#000000",
  alwaysWhite: "#FFFFFF",
} as const;
