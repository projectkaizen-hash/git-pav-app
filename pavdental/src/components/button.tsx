import {
  Pressable,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from "react-native";
import { colors, spacing, radius } from "@/theme";
import { ThemedText } from "./themed-text";

// ─── Variant map ──────────────────────────────────────────────────────────────
const variants = {
  primary: {
    backgroundColor: colors.brand,
    color: colors.onBrand,
  },
  secondary: {
    backgroundColor: colors.brandSubtle,
    color: colors.brand,
  },
  ghost: {
    backgroundColor: "transparent",
    color: colors.brand,
  },
  destructive: {
    backgroundColor: colors.dangerSubtle,
    color: colors.danger,
  },
} as const;

// ─── Size map ─────────────────────────────────────────────────────────────────
const sizes = {
  sm: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    minHeight: 36,
  },
  md: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 44, // WCAG 2.2 minimum tap target
  },
  lg: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
} as const;

// ─── Props ────────────────────────────────────────────────────────────────────
interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Accessibility label override — defaults to title */
  accessibilityLabel?: string;
}

/**
 * Button — the primary interactive primitive for this app.
 * All variants draw from theme tokens; never hardcode colour or spacing here.
 */
export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const v = variants[variant];
  const s = sizes[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: v.backgroundColor,
          borderRadius: radius.md,
          // @ts-ignore — borderCurve is an iOS-specific style; silently ignored on Android
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          opacity: isDisabled ? 0.45 : pressed ? 0.75 : 1,
          ...s,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.color as string} />
      ) : (
        <ThemedText
          variant="headline"
          style={{ color: v.color }}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

