// ─── Display text helpers ─────────────────────────────────────────────────────
// The design uses sentence case for every label, badge and tag ("Confirmed",
// "In clinic"), never shouty uppercase. Use this for enum-like API values.

/** "in_progress" / "CONFIRMED" → "In progress" / "Confirmed" */
export function toLabel(value: string | null | undefined): string {
  if (!value) return "";
  const words = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
