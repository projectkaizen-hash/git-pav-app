import { Pressable, StyleSheet, View } from "react-native";
import { colors, spacing } from "@/theme";
import { ThemedText } from "./themed-text";
import { AppIcon } from "./app-icon";

interface SectionHeaderProps {
  /** Uppercase eyebrow label */
  title: string;
  /** Optional trailing action, e.g. "See all" */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * SectionHeader — overline-caps eyebrow with optional trailing action
 * (reference pattern: "Special for you · See all ›").
 */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <ThemedText variant="overline">{title}</ThemedText>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
        >
          <ThemedText variant="caption" style={styles.actionText}>
            {actionLabel}
          </ThemedText>
          <AppIcon name="chevronRight" size={12} color={colors.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 32,
    marginBottom: spacing.xs,
  },
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    minHeight: 44,
    justifyContent: "center",
  },
  actionText: {
    color: colors.ink,
    fontWeight: "600",
  },
});
