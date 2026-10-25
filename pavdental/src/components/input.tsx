import { useState } from "react";
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { colors, spacing, radius, sizes, type } from "@/theme";
import { ThemedText } from "./themed-text";

export type InputState = "default" | "focused" | "error" | "disabled";

interface InputProps extends Omit<TextInputProps, "style"> {
  /** Field label — floats inside the field, as in the reference */
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
 * Input — reference text field: grey fill, square-ish top corners, 2pt
 * underline that turns black on focus and red on error. The label sits
 * inside the field at body size and shrinks to a 13pt caption once the
 * field is focused or filled.
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
  placeholder,
  value,
  defaultValue,
  multiline,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = !!error;
  const hasValue = !!(value ?? defaultValue);
  const floated = !label || isFocused || hasValue;

  const underline = hasError
    ? colors.danger
    : isFocused
    ? colors.ink
    : colors.inputUnderline;

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.field,
          multiline && styles.fieldMultiline,
          { borderBottomColor: underline, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        <View style={styles.inner}>
          {label ? (
            <View
              pointerEvents="none"
              style={!floated && styles.labelResting}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <ThemedText
                variant={floated ? "caption" : "body"}
                style={styles.label}
                numberOfLines={1}
              >
                {label}
              </ThemedText>
            </View>
          ) : null}
          <TextInput
            {...props}
            value={value}
            defaultValue={defaultValue}
            multiline={multiline}
            editable={!disabled}
            placeholder={floated ? placeholder : undefined}
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
              label ? styles.inputWithLabel : null,
              !floated && styles.inputHidden,
              multiline && styles.inputMultiline,
            ]}
          />
        </View>
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
    gap: spacing.xs,
  },
  error: {
    color: colors.danger,
  },
  hint: {
    color: colors.secondaryLabel,
  },
  field: {
    minHeight: sizes.input,
    backgroundColor: colors.tertiaryBackground,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    borderBottomWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  fieldMultiline: {
    alignItems: "flex-start",
    minHeight: 112,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.xs,
  },
  label: {
    color: colors.secondaryLabel,
  },
  labelResting: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  input: {
    ...type.body,
    color: colors.label,
    minHeight: 24,
    padding: 0,
  },
  inputWithLabel: {
    marginTop: 2,
  },
  inputHidden: {
    // Keeps the native input focusable while the resting label is shown
    color: "transparent",
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  rightSlot: {
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
});
