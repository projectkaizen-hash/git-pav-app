import React from "react";
import { View, StyleSheet } from "react-native";
import { colors, spacing } from "@/theme";
import { ThemedText } from "./themed-text";
import { AppIcon } from "./app-icon";
import { useIsOnline } from "@/lib/network";

interface OfflineBannerProps {
  message?: string;
}

export function OfflineBanner({
  message = "You are currently offline. Changes will sync when reconnected.",
}: OfflineBannerProps) {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessibilityLabel={message}
    >
      <AppIcon name="wifiOff" size={16} color={colors.label} />
      <ThemedText variant="caption" style={styles.text}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.warningSubtle,
    borderBottomColor: colors.warning,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xs,
    width: "100%",
  },
  text: {
    color: colors.label,
    fontWeight: "500",
  },
});
