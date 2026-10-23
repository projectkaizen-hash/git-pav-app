import React from "react";
import { StyleProp, ViewStyle, TextStyle, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { colors } from "@/theme";
import { BETTER_ICONS_REGISTRY } from "./better-icons-registry";

// ─── Semantic icon mapping powered by Better Icons (better-auth/better-icons) ─
// 200,000+ icons from 150+ icon libraries (Lucide, Phosphor, Material Design, Tabler).
// Rendered via native vector SVGs with crisp 2px line geometry and dynamic theming.

export type AppIconName = keyof typeof BETTER_ICONS_REGISTRY;

export interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle | TextStyle>;
}

/**
 * AppIcon — semantic vector icon primitive powered by better-icons.
 * Renders pixel-perfect, scalable SVGs from Lucide, Phosphor, and Iconify.
 */
export function AppIcon({
  name,
  size = 20,
  color = colors.label,
  style,
}: AppIconProps) {
  const icon = BETTER_ICONS_REGISTRY[name] || BETTER_ICONS_REGISTRY.alert;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
        },
        style as StyleProp<ViewStyle>,
      ]}
    >
      <SvgXml xml={icon.svg} width={size} height={size} color={color} />
    </View>
  );
}

