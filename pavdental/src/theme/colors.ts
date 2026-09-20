import { Platform } from "react-native";
import { Color } from "expo-router";

// ─── Semantic / platform-adaptive colours ────────────────────────────────────
// These are static-safe: they resolve on-device without a hook.
// Prefer these for backgrounds, labels, and separators.
export const colors = {
  // Text
  label: Platform.select({
    ios: Color.ios.label,
    android: Color.android.dynamic.onSurface,
    default: "#0F172A",
  })!,
  secondaryLabel: Platform.select({
    ios: Color.ios.secondaryLabel,
    android: Color.android.dynamic.onSurfaceVariant,
    default: "#475569",
  })!,
  tertiaryLabel: Platform.select({
    ios: Color.ios.tertiaryLabel,
    android: Color.android.dynamic.outline,
    default: "#94A3B8",
  })!,

  // Backgrounds (60 %)
  systemBackground: Platform.select({
    ios: Color.ios.systemBackground,
    android: Color.android.dynamic.surface,
    default: "#FFFFFF",
  })!,
  secondaryBackground: Platform.select({
    ios: Color.ios.secondarySystemBackground,
    android: Color.android.dynamic.surfaceVariant,
    default: "#F5F7F9",
  })!,
  tertiaryBackground: Platform.select({
    ios: Color.ios.tertiarySystemBackground,
    android: Color.android.dynamic.surfaceContainerLow,
    default: "#EFF2F5",
  })!,

  // Separator / divider
  separator: Platform.select({
    ios: Color.ios.separator,
    android: Color.android.dynamic.outlineVariant,
    default: "#E2E8F0",
  })!,

  // Accent / brand (10 %) — static hex; swap when real brand assets arrive
  brand: "#0D9488", // teal — placeholder
  brandSubtle: "#CCFBF1", // teal at ~15 % opacity — used for badge bg, subtle highlight
  onBrand: "#FFFFFF", // text on brand-coloured surfaces

  // Status semantics
  success: "#059669",
  successSubtle: "#D1FAE5",
  warning: "#D97706",
  warningSubtle: "#FEF3C7",
  danger: "#DC2626",
  dangerSubtle: "#FEE2E2",
  info: "#2563EB",
  infoSubtle: "#DBEAFE",

  // Always-fixed values (do not adapt to dark mode)
  onTint: "#FFFFFF",
  alwaysBlack: "#000000",
  alwaysWhite: "#FFFFFF",
} as const;

