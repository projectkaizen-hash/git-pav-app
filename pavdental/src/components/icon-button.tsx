import { Pressable, StyleSheet, StyleProp, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius } from "@/theme";
import { AppIcon, type AppIconName } from "./app-icon";

interface IconButtonProps {
  icon: AppIconName;
  /** Accessibility label — REQUIRED for icon-only buttons */
  label: string;
  onPress?: () => void;
  size?: number;
  color?: string;
  /** Filled ink circle, soft circular grey pill, or transparent press-only feedback */
  variant?: "solid" | "plain" | "soft";
  disabled?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * IconButton — 44pt minimum circular touch target for icon-only actions.
 * Always pass a label; icon-only buttons are invisible to screen readers otherwise.
 */
export function IconButton({
  icon,
  label,
  onPress,
  size = 20,
  color = colors.label,
  variant = "plain",
  disabled = false,
  haptic = true,
  style,
}: IconButtonProps) {
  const diameter = Math.max(44, size + 24);

  const handlePress = () => {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        variant === "solid" && styles.solid,
        variant === "soft" && styles.soft,
        { width: diameter, height: diameter },
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <AppIcon
        name={icon}
        size={size}
        color={variant === "solid" ? colors.onInk : color}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
  solid: {
    backgroundColor: colors.ink,
  },
  soft: {
    backgroundColor: colors.inkSubtle,
  },
  pressed: {
    opacity: 0.7,
  },
});
