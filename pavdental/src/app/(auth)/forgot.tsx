import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { authApi } from "@/features/auth/auth-api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;

    try {
      setLoading(true);
      await authApi.forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      // Intentionally treat all as success to prevent email enumeration
      setSubmitted(true);
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
              Reset Password
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              {submitted
                ? `If an account exists for ${email}, a reset link has been dispatched.`
                : "Enter your registered email address and we'll send instructions to reset your password."}
            </ThemedText>
          </View>

          {!submitted ? (
            <View style={styles.form}>
              <Input
                label="Email address"
                placeholder="name@example.co.uk"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          ) : (
            <View style={styles.successCard}>
              <ThemedText variant="headline" style={styles.successTitle}>
                Check your inbox
              </ThemedText>
              <ThemedText variant="subhead" style={styles.successBody}>
                Follow the instructions in the email to choose a new password. The link will expire in 30 minutes.
              </ThemedText>
            </View>
          )}

          <View style={styles.actions}>
            {!submitted ? (
              <Button
                title="Send Reset Instructions"
                size="lg"
                loading={loading}
                onPress={handleSubmit}
              />
            ) : null}

            <Button
              title="Return to Sign In"
              variant={submitted ? "primary" : "ghost"}
              size="lg"
              onPress={() => router.push("/(auth)/sign-in")}
            />
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
  successBody: {
    color: colors.secondaryLabel,
  },
  successCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  successTitle: {
    color: colors.brand,
  },
  title: {
    color: colors.label,
  },
});

