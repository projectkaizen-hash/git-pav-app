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
  md: spacing.gutter,
  lg: spacing.lg,
} as const;

/**
 * Card — base container with rounded corners and optional elevation.
 * Reference cards are flat white with 12pt continuous corners: no border,
 * no shadow. Hierarchy comes from the grey canvas behind them.
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
    borderRadius: radius.lg,
    borderWidth: 0,
    borderColor: "transparent",
    // @ts-ignore
    borderCurve: "continuous",
    overflow: "hidden",
  },
  dark: {
    backgroundColor: colors.ink,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.separator,
  },
  accent: {
    backgroundColor: colors.infoSubtle,
  },
  raised: {
    // @ts-ignore — boxShadow is supported in RN 0.76+
    boxShadow: shadows.raised,
  },
});

