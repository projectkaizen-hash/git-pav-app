import { Text, TextProps } from "react-native";
import { type } from "@/theme";

type TypeVariant = keyof typeof type;

interface ThemedTextProps extends TextProps {
  /** One of the named text style presets from src/theme/typography.ts */
  variant?: TypeVariant;
}

/**
 * ThemedText — the only way to render text in this app.
 * Screens and components must never set fontSize, fontWeight, or color directly.
 */
export function ThemedText({
  variant = "body",
  style,
  ...props
}: ThemedTextProps) {
  return <Text style={[type[variant], style]} {...props} />;
}

