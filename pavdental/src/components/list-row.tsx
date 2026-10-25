import {
  Pressable,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { colors, spacing } from "@/theme";
import { ThemedText } from "./themed-text";

interface ListRowProps {
  /** Primary label */
  title: string;
  /** Optional secondary label below title */
  subtitle?: string;
  /** Slot rendered on the left (icon, avatar, etc.) */
  left?: React.ReactNode;
  /** Slot rendered on the right (badge, value, chevron, toggle) */
  right?: React.ReactNode;
  /** Show separator line below the row */
  separator?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * ListRow — the standard list item primitive.
 * Pass left/right slots for icons, badges, or interactive controls.
 * Do not add more content props — compose with slots instead.
 */
export function ListRow({
  title,
  subtitle,
  left,
  right,
  separator = false,
  onPress,
  style,
  accessibilityLabel,
  accessibilityHint,
}: ListRowProps) {
  const inner = (
    <View style={[styles.row, style]}>
      {left ? <View style={styles.leftSlot}>{left}</View> : null}

      <View style={styles.content}>
        <ThemedText variant="body" style={styles.titleText}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText variant="subhead" style={styles.subtitleText}>{subtitle}</ThemedText>
        ) : null}
      </View>

      {right ? <View style={styles.rightSlot}>{right}</View> : null}

      {separator ? <View style={styles.separator} /> : null}
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: 2,
  },
  leftSlot: {
    marginRight: spacing.sm,
  },
  rightSlot: {
    marginLeft: spacing.sm,
  },
  row: {
    minHeight: 52, // Neo Financial generous tap target
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.systemBackground,
  },
  titleText: {
    fontWeight: "500",
    color: colors.label,
  },
  subtitleText: {
    color: colors.secondaryLabel,
  },
  separator: {
    backgroundColor: colors.separator,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    left: spacing.md,
    position: "absolute",
    right: 0,
  },
});

