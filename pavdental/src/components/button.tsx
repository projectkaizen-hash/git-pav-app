import {
  Pressable,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius } from "@/theme";
import { ThemedText } from "./themed-text";

// ─── Variant map ──────────────────────────────────────────────────────────────
const variants = {
  primary: {
    backgroundColor: colors.ink,
    color: colors.onInk,
  },
  secondary: {
    backgroundColor: colors.inkSubtle,
    color: colors.ink,
  },
  ghost: {
    backgroundColor: "transparent",
    color: colors.ink,
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
  /** Optional icon to render alongside the title */
  icon?: React.ReactNode;
  /** Position of the icon relative to title (default "left") */
  iconPosition?: "left" | "right";
  /** Trigger light haptic on press (defaults to true) */
  haptic?: boolean;
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
  icon,
  iconPosition = "left",
  haptic = true,
}: ButtonProps) {
  const v = variants[variant];
  const s = sizes[size];
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          backgroundColor: v.backgroundColor,
          borderRadius: radius.md,
          // @ts-ignore — borderCurve is an iOS-specific style; silently ignored on Android
          borderCurve: "continuous",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: spacing.xs,
          opacity: isDisabled ? 0.45 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
          ...s,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.color as string} />
      ) : (
        <>
          {icon && iconPosition === "left" ? <View>{icon}</View> : null}
          <ThemedText
            variant="headline"
            style={{ color: v.color }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {title}
          </ThemedText>
          {icon && iconPosition === "right" ? <View>{icon}</View> : null}
        </>
      )}
    </Pressable>
  );
}

