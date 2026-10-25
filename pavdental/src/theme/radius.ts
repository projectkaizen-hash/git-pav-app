// ─── Border radius scale ───────────────────────────────────────────────────────
// Matched to the iOS reference: cards, buttons and icon buttons share 12pt.
// Pair non-capsule radii with borderCurve: "continuous" for iOS squircle feel.
export const radius = {
  xs: 4, // progress bars, tiny badges
  sm: 8, // small inline buttons, text-field top corners, thumbnails
  md: 10, // 40pt icon tiles inside rows
  lg: 12, // cards, buttons, icon buttons, inputs
  xl: 16, // bottom sheets, hero images
  full: 9999, // capsule / pill — chips, avatars, switches
} as const;
