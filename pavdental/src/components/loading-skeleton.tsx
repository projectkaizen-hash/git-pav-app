import { useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { colors, radius, spacing } from "@/theme";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}

/**
 * Skeleton — shimmer loading placeholder.
 * Use for first-load states on screens with a known layout.
 * Prefer this over a full-screen spinner for slow initial loads.
 */
export function Skeleton({ width = "100%", height = 20, borderRadius = radius.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  Animated.loop(
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
    ])
  ).start();

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.secondaryBackground,
          opacity,
        },
        style,
      ]}
      accessibilityRole="none"
      importantForAccessibility="no"
    />
  );
}

/** Pre-composed skeleton for a card with title + subtitle */
export function CardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton height={16} width="60%" />
      <Skeleton height={12} width="40%" />
    </View>
  );
}

/** Pre-composed skeleton for a list row */
export function RowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={44} height={44} borderRadius={radius.full} />
      <View style={styles.rowContent}>
        <Skeleton height={16} width="55%" />
        <Skeleton height={12} width="35%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rowContent: {
    flex: 1,
    gap: spacing.xxs,
  },
});

