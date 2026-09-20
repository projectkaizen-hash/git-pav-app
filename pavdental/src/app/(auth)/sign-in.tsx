import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { authApi } from "@/features/auth/auth-api";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authApi.signIn(email.trim(), password);
      // Route protection in (auth)/_layout will redirect on auth state change
    } catch (err: any) {
      setError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ThemedText variant="largeTitle" style={styles.title}>
              Welcome back
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              Sign in to manage your appointments, records, and treatments.
            </ThemedText>
          </View>

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <ThemedText variant="caption" style={styles.errorText}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          {/* Quick Demo Role Fillers */}
          <View style={styles.demoRow}>
            <ThemedText variant="caption" style={styles.demoLabel}>Demo 1-Tap Fill:</ThemedText>
            <View style={styles.demoPills}>
              {[
                { label: "Patient", email: "patient@pavdental.com" },
                { label: "Clinician", email: "doctor@pavdental.com" },
                { label: "Van Operator", email: "van@pavdental.com" },
              ].map((role) => (
                <Pressable
                  key={role.label}
                  onPress={() => {
                    setEmail(role.email);
                    setPassword("Password123!");
                    if (error) setError(null);
                  }}
                  style={styles.demoPill}
                >
                  <ThemedText variant="caption" style={styles.demoPillText}>{role.label}</ThemedText>
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

            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
            />

            <Pressable
              onPress={() => router.push("/(auth)/forgot")}
              style={styles.forgotPassPressable}
            >
              <ThemedText variant="caption" style={styles.forgotText}>
                Forgot your password?
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Button
              title="Sign In"
              size="lg"
              loading={loading}
              onPress={handleSignIn}
            />

            <Button
              title="Use Phone OTP Instead"
              variant="secondary"
              size="md"
              onPress={() => router.push("/(auth)/otp")}
            />

            <View style={styles.footerRow}>
              <ThemedText variant="subhead" style={styles.footerLabel}>
                Don't have an account?{" "}
              </ThemedText>
              <Pressable onPress={() => router.push("/(auth)/sign-up")}>
                <ThemedText variant="subhead" style={styles.footerLink}>
                  Register
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
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
  footerLabel: {
    color: colors.secondaryLabel,
  },
  footerLink: {
    color: colors.brand,
    fontWeight: "600",
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  forgotPassPressable: {
    alignSelf: "flex-end",
    paddingVertical: spacing.xxs,
  },
  forgotText: {
    color: colors.brand,
    fontWeight: "600",
  },
  form: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});

