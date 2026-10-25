import { useState } from "react";
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { colors, spacing, type } from "@/theme";
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
  /** Optional slot rendered inside the right edge of input */
  rightSlot?: React.ReactNode;
}

/**
 * Input — styled text input with label, hint, and error state.
 * Refactored to Neo Financial soft-filled continuous squircle inputs.
 */
export function Input({
  label,
  error,
  hint,
  disabled = false,
  containerStyle,
  rightSlot,
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
    : "transparent";

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <ThemedText variant="subhead" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            borderWidth: isFocused || hasError ? 1.5 : 1,
            backgroundColor: isFocused ? colors.systemBackground : colors.secondaryBackground,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
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
          style={[styles.input, rightSlot ? { paddingRight: 40 } : null]}
        />
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>

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
    marginTop: 2,
  },
  hint: {
    color: colors.tertiaryLabel,
    marginTop: 2,
  },
  inputWrapper: {
    minHeight: 52, // Neo Financial comfortable touch target
    borderRadius: 14,
    // @ts-ignore
    borderCurve: "continuous",
    borderColor: colors.separator,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    overflow: "hidden",
  },
  input: {
    ...type.body,
    flex: 1,
    minHeight: 52,
    color: colors.label,
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.label,
    fontWeight: "500",
    marginBottom: 2,
  },
  rightSlot: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
});

