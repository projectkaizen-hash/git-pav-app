// ─── Semantic palette — matched to the iOS reference (neo-financial-ios/) ─────
// Static LIGHT values (app is light-only — see app.json userInterfaceStyle).
// Hierarchy comes from fill colour, not borders or shadows: a cool grey canvas,
// flat white cards, and a slightly darker grey fill for inputs, icon tiles and
// secondary buttons. Colour is reserved for status. Never hardcode hexes in screens.
//
// Values are sampled from the reference screenshots. Where a sampled value
// failed WCAG AA for text (secondary grey, link blue, success green) it is
// darkened just enough to pass on both the canvas and white.
export const colors = {
  // Core ink — pure black, as in the reference (21:1 on white)
  ink: "#000000",
  inkSoft: "#2B2F33", // pressed ink, dark secondary surfaces
  onInk: "#FFFFFF",
  inkSubtle: "#E7E8E9", // grey fill — chips, secondary buttons, icon tiles

  // Text
  label: "#000000",
  secondaryLabel: "#5E6B73", // blue-grey; 4.9:1 on canvas, 5.5:1 on white
  tertiaryLabel: "#8A949A", // placeholders, disabled, inactive tab icons

  // Surfaces
  background: "#F1F3F3", // screen canvas
  systemBackground: "#FFFFFF", // cards, grouped rows, sheets
  secondaryBackground: "#F1F3F3", // subtle fill on white cards (== canvas)
  tertiaryBackground: "#E7E8E9", // fill on the canvas: inputs, icon buttons
  tabBar: "#F4F5F5",

  // Lines
  separator: "#E7E8E9", // row dividers, inset to the text column
  inputUnderline: "#818C94", // 2pt underline on filled text fields

  // Status semantics (the only saturated colours in the app)
  success: "#0C7F5C", // text-safe green
  successFill: "#1BA47C", // switches, strength bars, check circles
  successSubtle: "#DDF3EA",
  warning: "#8A6100",
  warningFill: "#E8A317",
  warningSubtle: "#FDF1D6",
  danger: "#B42318",
  dangerSubtle: "#FDE6E4",
  info: "#0062E6", // links and info accents
  infoSubtle: "#E2EDFD",

  // Toast / snackbar
  toast: "#1C1D1F",

  // Always-fixed values (do not adapt to theme)
  onTint: "#FFFFFF",
  alwaysBlack: "#000000",
  alwaysWhite: "#FFFFFF",
  scrim: "rgba(0, 0, 0, 0.4)",
} as const;
