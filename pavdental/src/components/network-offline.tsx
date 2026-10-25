import { View, StyleSheet } from "react-native";
import { colors, spacing, radius } from "@/theme";
import { ThemedText } from "./themed-text";
import { Button } from "./button";
import { AppIcon } from "./app-icon";

interface NetworkOfflineProps {
  /** Optional custom message */
  message?: string;
  /** Action to retry when connection is restored */
  onRetry?: () => void;
}

/**
 * NetworkOffline — shown when the device has no internet connection.
 * Provides clear guidance and retry option when connection is restored.
 */
export function NetworkOffline({
  message = "No internet connection. Please check your network settings.",
  onRetry,
}: NetworkOfflineProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <View style={styles.iconWrap} accessibilityElementsHidden>
        <AppIcon name="wifiOff" size={30} color={colors.ink} />
      </View>

      <ThemedText variant="headline" style={styles.message}>
        {message}
      </ThemedText>

      {onRetry ? (
        <Button
          title="Retry"
          variant="secondary"
          onPress={onRetry}
          style={styles.cta}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  cta: {
    marginTop: spacing.xs,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: radius.full,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  message: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
});
