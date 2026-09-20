import { View, ViewProps, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { colors, radius, spacing, shadows } from "@/theme";

interface CardProps extends ViewProps {
  /** Use "raised" for action-oriented cards, "flat" for content list items */
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
 * Accept children for composition; don't add content-specific props here.
 */
export function Card({
  elevation = "flat",
  padding = "md",
  style,
  children,
  ...props
}: CardProps) {
  return (
    <View
      {...props}
      style={[
        styles.base,
        { padding: paddingMap[padding] },
        elevation === "raised" && styles.raised,
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
    // @ts-ignore
    borderCurve: "continuous",
    overflow: "hidden",
  },
  raised: {
    // @ts-ignore — boxShadow is supported in RN 0.76+
    boxShadow: shadows.raised,
  },
});

