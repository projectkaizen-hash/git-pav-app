import { View, StyleSheet } from "react-native";
import { colors, spacing } from "@/theme";
import { ThemedText } from "./themed-text";
import { Button } from "./button";

interface EmptyStateProps {
  /** Short, empathetic heading */
  heading: string;
  /** Optional supporting copy explaining what to do */
  body?: string;
  /** Primary CTA label */
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * EmptyState — never show a blank list.
 * Always explain *why* it is empty and offer the relevant next action.
 * To add branded illustrations: add SVG/PNG files to assets/illustrations/
 * and import them here (e.g., import emptyImage from '@/assets/illustrations/empty.png')
 */
export function EmptyState({
  heading,
  body,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View
      style={styles.container}
      accessibilityRole="none"
      accessibilityLabel={`${heading}${body ? `. ${body}` : ""}`}
    >
      {/* TODO: replace with branded illustration from assets/illustrations/ */}
      <View style={styles.illustrationPlaceholder} />

      <ThemedText variant="title" style={styles.heading}>
        {heading}
      </ThemedText>

      {body ? (
        <ThemedText variant="subhead" style={styles.body}>
          {body}
        </ThemedText>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          style={styles.cta}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  container: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  cta: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  heading: {
    textAlign: "center",
  },
  illustrationPlaceholder: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 60,
    height: 120,
    marginBottom: spacing.xs,
    width: 120,
  },
});

