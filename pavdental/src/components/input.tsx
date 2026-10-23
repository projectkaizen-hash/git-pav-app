import { useState } from "react";
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
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = !!error;

  const borderColor = hasError
    ? colors.danger
    : isFocused
    ? colors.ink
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
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            borderColor,
            backgroundColor: isFocused ? colors.systemBackground : colors.secondaryBackground,
            opacity: disabled ? 0.5 : 1,
          },
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
    minHeight: 48, // Comfortable 48pt touch target
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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

