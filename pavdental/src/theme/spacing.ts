// ─── 4-point grid spacing scale ───────────────────────────────────────────────
// All values divisible by 4. Use gap with these tokens for layout rhythm.
// Screen edge padding is spacing.gutter (20), as in the iOS reference.
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  gutter: 20, // screen side margin and card inner padding
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 80,
  max: 96,
} as const;

// ─── Fixed component sizes from the reference ─────────────────────────────────
export const sizes = {
  button: 52, // primary / secondary buttons
  buttonSmall: 32, // inline "Refer friends" style buttons
  iconButton: 40, // square back / close / profile buttons
  iconTile: 40, // leading icon tile inside rows
  input: 58, // filled text field
  row: 64, // single-line grouped row
} as const;
