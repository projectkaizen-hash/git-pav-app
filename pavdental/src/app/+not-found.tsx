import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components";
import { colors, spacing } from "@/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page Not Found" }} />
      <View style={styles.container}>
        <ThemedText variant="title">This screen doesn't exist.</ThemedText>
        <Link href="/" style={styles.link}>
          <ThemedText variant="body" style={styles.linkText}>
            Return to home screen
          </ThemedText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  link: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkText: {
    color: colors.brand,
    fontWeight: "600",
  },
});

