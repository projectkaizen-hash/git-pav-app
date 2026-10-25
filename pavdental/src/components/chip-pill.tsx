import { Pressable, StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, spacing, radius } from "@/theme";
import { ThemedText } from "./themed-text";

type ChipTone = "neutral" | "fill" | "ink" | "success" | "info" | "warning";

interface ChipPillProps {
  label: string;
  /** ink = selected/emphasis; neutral = resting; status tones for meta chips */
  tone?: ChipTone;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const toneMap: Record<ChipTone, { bg: string; text: string }> = {
  // White chip on the grey canvas (reference filter chips)
  neutral: { bg: colors.systemBackground, text: colors.label },
  // Grey chip for use inside white cards
  fill: { bg: colors.inkSubtle, text: colors.label },
  ink: { bg: colors.ink, text: colors.onInk },
  success: { bg: colors.successSubtle, text: colors.success },
  info: { bg: colors.infoSubtle, text: colors.info },
  warning: { bg: colors.warningSubtle, text: colors.warning },
};

/**
 * ChipPill — capsule chip for filters, meta labels, and choice rows
 * (reference pattern: "5 min · Morning" meta pills, filter chips).
 * Pass onPress for interactive chips; without it the chip is static meta.
 */
export function ChipPill({ label, tone = "neutral", selected, onPress, style }: ChipPillProps) {
  const t = selected ? toneMap.ink : toneMap[tone];
  const interactive = !!onPress;

  const content = (
    <View style={[styles.base, { backgroundColor: t.bg }, style]}>
      <ThemedText variant="footnote" style={[styles.label, { color: t.text }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );

  if (!interactive) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  label: {
    fontWeight: "600",
  },
});
