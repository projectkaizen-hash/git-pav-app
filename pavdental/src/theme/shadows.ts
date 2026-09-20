// ─── Box shadow strings (use boxShadow, never legacy elevation/shadow* props) ──
// Three elevation levels are enough for the entire app.
export const shadows = {
  // Subtle card lift — use on cards sitting on systemBackground
  card: "0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)",
  // Raised element — action sheets, pickers, date panels
  raised: "0 4px 12px rgba(0, 0, 0, 0.10)",
  // Overlay — modals, bottom sheets, floating menus
  overlay: "0 8px 24px rgba(0, 0, 0, 0.18)",
} as const;

