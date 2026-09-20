import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { colors } from "@/theme";
import { ThemedText } from "./themed-text";

interface AvatarProps {
  /** Full name — used to generate initials fallback */
  name: string;
  /** Photo URI — if provided, shows image; otherwise shows initials */
  uri?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: 32,
  md: 44,
  lg: 64,
} as const;

const initialsFontSize = { sm: 13, md: 17, lg: 24 } as const;

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/**
 * Avatar — shows a photo (via expo-image) or initials fallback.
 * Uses expo-image for blurhash + caching.
 */
export function Avatar({ name, uri, size = "md" }: AvatarProps) {
  const dim = sizeMap[size];
  const initials = getInitials(name);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.base,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
          },
        ]}
        accessibilityLabel={name}
        accessibilityRole="image"
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: colors.brandSubtle,
        },
      ]}
      accessibilityLabel={name}
      accessibilityRole="image"
    >
      <ThemedText
        variant="body"
        style={{ fontSize: initialsFontSize[size], color: colors.brand, fontWeight: "600" }}
        accessibilityElementsHidden
      >
        {initials}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

