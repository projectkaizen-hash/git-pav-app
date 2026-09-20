import { TextStyle } from "react-native";
import { colors } from "./colors";

// ─── Named text styles — mirrors Apple text style ramp ────────────────────────
// One font family, ≤4 effective sizes, ≤2 weights.
// Dynamic Type is on by default (allowFontScaling unset = true).
// Use ThemedText component to apply these; screens never touch fontSize directly.
export const type = {
  // Display / hero — non-stack contexts only (stack sets largeTitle via header)
  largeTitle: {
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 41,
    letterSpacing: 0.37,
    color: colors.label,
  },
  // Section headers, modal titles
  title: {
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 28,
    color: colors.label,
  },
  // Cards, list headers, primary labels
  headline: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 22,
    color: colors.label,
  },
  // Body copy, form labels
  body: {
    fontSize: 17,
    fontWeight: "400",
    lineHeight: 22,
    color: colors.label,
  },
  // Secondary content, list subtitles
  subhead: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    color: colors.secondaryLabel,
  },
  // Timestamps, metadata, fine print
  caption: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
    color: colors.secondaryLabel,
  },
  // Prices, stats, metrics — uses tabular nums for alignment
  mono: {
    fontSize: 17,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    lineHeight: 22,
    color: colors.label,
  },
} as const satisfies Record<string, TextStyle>;

