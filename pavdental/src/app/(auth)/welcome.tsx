import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ThemedText, Input, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { authApi } from "@/features/auth/auth-api";

export default function WelcomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if email exists in database
      const result = await authApi.checkEmail(trimmedEmail);

      if (result.exists) {
        // User exists -> Show Password screen (Sign In)
        router.push({
          pathname: "/(auth)/sign-in",
          params: { email: trimmedEmail },
        });
      } else {
        // User doesn't exist -> Show Registration details screen (Sign Up)
        router.push({
          pathname: "/(auth)/sign-up",
          params: { email: trimmedEmail },
        });
      }
    } catch (err: any) {
      setError(err?.message || "Could not verify email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.logoMark} />
            <ThemedText variant="largeTitle" style={styles.headline}>
              Your dental care,{"\n"}wherever you are.
            </ThemedText>
            <ThemedText variant="subhead" style={styles.sub}>
              Enter your email to sign in or create an account.
            </ThemedText>
          </View>

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <ThemedText variant="caption" style={styles.errorText}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          {/* Quick Demo 1-Tap Fillers */}
          <View style={styles.demoRow}>
            <ThemedText variant="caption" style={styles.demoLabel}>Demo Quick Email:</ThemedText>
            <View style={styles.demoPills}>
              {[
                { label: "Existing Patient", email: "patient@pavdental.com" },
                { label: "New User", email: `new_${Date.now().toString().slice(-4)}@pavdental.com` },
              ].map((demo) => (
                <Pressable
                  key={demo.label}
                  onPress={() => {
                    setEmail(demo.email);
                    if (error) setError(null);
                  }}
                  style={styles.demoPill}
                >
                  <ThemedText variant="caption" style={styles.demoPillText}>{demo.label}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.form}>
            <Input
              label="Email address"
              placeholder="name@example.co.uk"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Continue"
              size="lg"
              loading={loading}
              onPress={handleContinue}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
    marginTop: spacing.xl,
  },
  demoLabel: {
    color: colors.secondaryLabel,
    fontWeight: "600",
  },
  demoPill: {
    backgroundColor: colors.brandSubtle,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  demoPillText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
  demoPills: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  demoRow: {
    gap: spacing.xxs,
    marginBottom: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.dangerSubtle,
    borderRadius: 8,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  flex: {
    flex: 1,
  },
  form: {
    gap: spacing.md,
  },
  headline: {
    color: colors.label,
    textAlign: "center",
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  logoMark: {
    backgroundColor: colors.brandSubtle,
    borderRadius: 24,
    height: 70,
    width: 70,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  sub: {
    color: colors.secondaryLabel,
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
});
