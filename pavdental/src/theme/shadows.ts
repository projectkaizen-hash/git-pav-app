// ─── Box shadow strings (use boxShadow, never legacy elevation/shadow* props) ──
// The reference is flat: cards and rows carry no shadow at all. Shadows are
// kept only for things that float above content.
export const shadows = {
  // Cards sitting on the canvas — intentionally none
  card: "0 0 0 rgba(0, 0, 0, 0)",
  // Floating controls — search pill, FAB, toasts
  raised: "0 4px 16px rgba(0, 0, 0, 0.12)",
  // Overlay — modals, bottom sheets, floating menus
  overlay: "0 -2px 24px rgba(0, 0, 0, 0.12)",
} as const;
