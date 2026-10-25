import React from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText, Button, AppIcon } from "@/components";
import { colors, spacing } from "@/theme";

// ─── Account created — soft success after late-auth sign-up ───────────────────
// Reference pattern: Zocdoc confirms the account, then invites (never forces)
// profile setup so momentum from booking is preserved.

export default function AccountCreatedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <View style={styles.markTile}>
          <AppIcon name="checkCircle" size={32} color={colors.onInk} />
        </View>
        <ThemedText variant="largeTitle" style={styles.title}>
          Account created
        </ThemedText>
        <ThemedText variant="subhead" style={styles.subtitle}>
          Welcome to Pav Dental. Set up your profile now so booking takes seconds
          later — or skip and do it any time.
        </ThemedText>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
        <Button
          title="Set up my profile"
          size="lg"
          accessibilityLabel="Continue to profile setup"
          onPress={() => router.replace("/onboarding/profile" as never)}
        />
        <Button
          title="I'll do this later"
          variant="ghost"
          size="sm"
          onPress={() => router.replace("/(patient)/(tabs)/home" as never)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  footer: {
    bottom: 0,
    gap: spacing.xs,
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  hero: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.xl,
  },
  markTile: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: 28,
    height: 64,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 64,
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 22,
    textAlign: "center",
  },
  title: {
    color: colors.label,
    textAlign: "center",
  },
});
