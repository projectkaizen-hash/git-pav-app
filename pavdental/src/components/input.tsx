import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { colors, spacing, radius, type } from "@/theme";
import { ThemedText } from "./themed-text";

export type InputState = "default" | "focused" | "error" | "disabled";

interface InputProps extends Omit<TextInputProps, "style"> {
  /** Field label rendered above the input */
  label?: string;
  /** Inline error message — renders the input in error state */
  error?: string;
  /** Hint text rendered below the input */
  hint?: string;
  /** Disable the field */
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Input — styled text input with label, hint, and error state.
 * Supports all TextInputProps — pass secureTextEntry, keyboardType, etc. directly.
 */
export function Input({
  label,
  error,
  hint,
  disabled = false,
  containerStyle,
  ...props
}: InputProps) {
  const hasError = !!error;

  const borderColor = hasError
    ? colors.danger
    : disabled
    ? colors.separator
    : colors.separator;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <ThemedText variant="subhead" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}

      <TextInput
        {...props}
        editable={!disabled}
        placeholderTextColor={colors.tertiaryLabel}
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ disabled }}
        style={[
          styles.input,
          { borderColor, opacity: disabled ? 0.5 : 1 },
        ]}
      />

      {hasError ? (
        <ThemedText
          variant="caption"
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText variant="caption" style={styles.hint}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxs,
  },
  error: {
    color: colors.danger,
  },
  hint: {
    color: colors.tertiaryLabel,
  },
  input: {
    ...type.body,
    minHeight: 44, // WCAG 2.2 tap target
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.secondaryBackground,
    borderRadius: radius.md,
    // @ts-ignore
    borderCurve: "continuous",
    borderWidth: 1.5,
    color: colors.label,
  },
  label: {
    color: colors.label,
  },
});

