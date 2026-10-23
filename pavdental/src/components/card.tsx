import { View, ViewProps, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { colors, radius, spacing, shadows } from "@/theme";

interface CardProps extends ViewProps {
  /** Visual variant matching Neo Financial aesthetic */
  variant?: "default" | "dark" | "outline" | "elevated" | "accent";
  /** Use "raised" for action-oriented cards, "flat" for content list items (legacy support) */
  elevation?: "flat" | "raised";
  /** Internal padding preset */
  padding?: "sm" | "md" | "lg" | "none";
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const paddingMap = {
  none: 0,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
} as const;

/**
 * Card — base container with rounded corners and optional elevation.
 * Refactored to support Neo Financial card styling with continuous squircle corners.
 */
export function Card({
  variant = "default",
  elevation = "flat",
  padding = "md",
  style,
  children,
  ...props
}: CardProps) {
  const isRaised = elevation === "raised" || variant === "elevated";

  return (
    <View
      {...props}
      style={[
        styles.base,
        variant === "dark" && styles.dark,
        variant === "outline" && styles.outline,
        variant === "accent" && styles.accent,
        isRaised && styles.raised,
        { padding: paddingMap[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.systemBackground,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.separator,
    // @ts-ignore
    borderCurve: "continuous",
    overflow: "hidden",
  },
  dark: {
    backgroundColor: colors.ink,
    borderColor: colors.inkSoft,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: colors.separator,
  },
  accent: {
    backgroundColor: colors.infoSubtle,
    borderColor: colors.info,
  },
  raised: {
    // @ts-ignore — boxShadow is supported in RN 0.76+
    boxShadow: shadows.raised,
    borderColor: "transparent",
  },
});

