import { Pressable, StyleSheet, StyleProp, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { colors, radius, sizes } from "@/theme";
import { AppIcon, type AppIconName } from "./app-icon";

interface IconButtonProps {
  icon: AppIconName;
  /** Accessibility label — REQUIRED for icon-only buttons */
  label: string;
  onPress?: () => void;
  size?: number;
  color?: string;
  /** Filled ink, soft grey fill (reference back/close buttons), or transparent */
  variant?: "solid" | "plain" | "soft";
  /** Rounded square (reference default) or circle (avatars, media controls) */
  shape?: "square" | "circle";
  disabled?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * IconButton — 40pt rounded-square icon action (44pt touch target via hitSlop),
 * as used for back, close and profile buttons in the reference.
 * Always pass a label; icon-only buttons are invisible to screen readers otherwise.
 */
export function IconButton({
  icon,
  label,
  onPress,
  size = 20,
  color = colors.label,
  variant = "plain",
  shape = "square",
  disabled = false,
  haptic = true,
  style,
}: IconButtonProps) {
  const diameter = Math.max(sizes.iconButton, size + 20);

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
      hitSlop={6}
      style={({ pressed }) => [
        styles.base,
        variant === "solid" && styles.solid,
        variant === "soft" && styles.soft,
        { width: diameter, height: diameter },
        shape === "circle" && styles.circle,
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
    borderRadius: radius.lg,
    // @ts-ignore — iOS squircle corners
    borderCurve: "continuous",
  },
  circle: {
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
