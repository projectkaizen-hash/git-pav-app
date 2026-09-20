import React from "react";
import { View, StyleSheet, Switch, Pressable } from "react-native";
import { ThemedText } from "../themed-text";
import { colors, spacing } from "@/theme";

export interface ToggleSwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  icon?: React.ReactNode;
  testID?: string;
}

export function ToggleSwitch({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
  icon,
  testID,
}: ToggleSwitchProps) {
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      accessibilityHint={description}
      style={({ pressed }) => [
        styles.container,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.leftContainer}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <View style={styles.textContainer}>
          <ThemedText variant="headline" style={styles.label}>
            {label}
          </ThemedText>
          {description ? (
            <ThemedText variant="caption" style={styles.description}>
              {description}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.separator, true: colors.brand }}
        thumbColor={colors.systemBackground}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  description: {
    color: colors.secondaryLabel,
  },
  disabled: {
    opacity: 0.5,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  label: {
    color: colors.label,
  },
  leftContainer: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
});

