import { View, StyleSheet } from "react-native";
import { colors, spacing } from "@/theme";
import { ThemedText } from "./themed-text";
import { Button } from "./button";

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
      <ThemedText variant="title" style={styles.icon} accessibilityElementsHidden>
        ⚠️
      </ThemedText>

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
  icon: {
    fontSize: 40,
  },
  message: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
});

