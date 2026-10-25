import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { colors, radius, sizes } from "@/theme";
import { AppIcon, type AppIconName } from "./app-icon";

interface IconTileProps {
  icon: AppIconName;
  /** Tile fill — grey on white cards (default), white on the canvas, or black */
  tone?: "fill" | "surface" | "ink";
  size?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}

const toneMap = {
  fill: { bg: colors.inkSubtle, fg: colors.ink },
  surface: { bg: colors.systemBackground, fg: colors.ink },
  ink: { bg: colors.ink, fg: colors.onInk },
} as const;

/**
 * IconTile — the 40pt rounded-square icon that leads reference rows
 * ("From · Chequing", "Amount · $2.00"). Decorative: hidden from screen readers.
 */
export function IconTile({ icon, tone = "fill", size = sizes.iconTile, iconColor, style }: IconTileProps) {
  const t = toneMap[tone];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { width: size, height: size, backgroundColor: t.bg }, style]}
    >
      <AppIcon name={icon} size={Math.round(size / 2)} color={iconColor ?? t.fg} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    borderRadius: radius.md,
    // @ts-ignore — iOS squircle corners
    borderCurve: "continuous",
    justifyContent: "center",
  },
});
