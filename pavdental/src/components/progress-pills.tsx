import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { useEffect } from "react";
import { colors, motion, radius } from "@/theme";

interface ProgressPillsProps {
  /** Total steps */
  total: number;
  /** Current step, 1-indexed */
  current: number;
}

/**
 * ProgressPills — segmented step indicator for onboarding flows
 * (reference pattern: thin progress bars at top of onboarding screens).
 */
export function ProgressPills({ total, current }: ProgressPillsProps) {
  const progress = useSharedValue(current / total);

  useEffect(() => {
    progress.value = withTiming(current / total, { duration: motion.base });
  }, [current, total, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current }}
      accessibilityLabel={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={styles.track}>
          {i < current - 1 ? (
            <View style={[styles.fill, { width: "100%" }]} />
          ) : i === current - 1 ? (
            <Animated.View style={[styles.fill, barStyle]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: radius.xs,
    backgroundColor: colors.inkSubtle,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.xs,
    backgroundColor: colors.ink,
  },
});
