import { View, StyleSheet } from "react-native";
import { colors, spacing } from "@/theme";
import { ThemedText } from "./themed-text";
import { Button } from "./button";
import { AppIcon } from "./app-icon";

interface ErrorStateProps {
  /** User-friendly error message (never raw API errors) */
  message?: string;
  onRetry?: () => void;
}

/**
 * ErrorState — shown when a screen fails to load data.
 * Always pair with cached data if available (non-blocking inline error pattern).
 */
export function ErrorState({
  message = "Something went wrong. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <View style={styles.iconWrap} accessibilityElementsHidden>
        <AppIcon name="alert" size={30} color={colors.warning} />
      </View>

      <ThemedText variant="headline" style={styles.message}>
        {message}
      </ThemedText>

      {onRetry ? (
        <Button
          title="Try again"
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
    backgroundColor: colors.warningSubtle,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  message: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
});

