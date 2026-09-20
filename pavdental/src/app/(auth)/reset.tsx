import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText, Input, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { authApi } from "@/features/auth/auth-api";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authApi.resetPassword(token || "placeholder-token", password);
      setCompleted(true);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Link may have expired.");
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
              {completed ? "Password Updated" : "Choose New Password"}
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              {completed
                ? "Your password has been changed securely. You can now sign in with your new credentials."
                : "Create a strong password containing numbers, letters, and symbols."}
            </ThemedText>
          </View>

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <ThemedText variant="caption" style={styles.errorText}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          {!completed ? (
            <View style={styles.form}>
              <Input
                label="New Password"
                placeholder="At least 8 characters"
                secureTextEntry
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (error) setError(null);
                }}
              />

              <Input
                label="Confirm New Password"
                placeholder="Re-enter password"
                secureTextEntry
                value={confirmPassword}
                onChangeText={(val) => {
                  setConfirmPassword(val);
                  if (error) setError(null);
                }}
              />
            </View>
          ) : null}

          <View style={styles.actions}>
            {!completed ? (
              <Button
                title="Update Password"
                size="lg"
                loading={loading}
                onPress={handleReset}
              />
            ) : (
              <Button
                title="Proceed to Sign In"
                size="lg"
                onPress={() => router.replace("/(auth)/sign-in")}
              />
            )}
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

