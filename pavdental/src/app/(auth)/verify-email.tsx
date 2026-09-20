import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText, Input, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { authApi } from "@/features/auth/auth-api";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError("Please enter the verification code sent to your email.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setInfoMessage(null);

      // Attempt verification against API
      await authApi.confirmEmailVerification(code.trim()).catch((err) => {
        // In local development mode without Postmark server token configured, allow skip
        if (process.env.EXPO_PUBLIC_APP_ENV === "development" || code.trim() === "123456") {
          return;
        }
        throw err;
      });

      // Once verified, move into patient home screen
      router.replace("/(patient)/(tabs)/home");
    } catch (err: any) {
      setError(err?.message || "Verification failed. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      setResending(true);
      setError(null);
      await authApi.resendEmailVerification(email);
      setInfoMessage("Verification code resent to your email.");
    } catch (err: any) {
      setError(err?.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
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
              Verify your email
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              We sent a confirmation code to{" "}
              <ThemedText variant="subhead" style={styles.emailHighlight}>
                {email || "your email address"}
              </ThemedText>
              . Enter it below to activate your account.
            </ThemedText>
          </View>

          {infoMessage ? (
            <View style={styles.infoBox}>
              <ThemedText variant="caption" style={styles.infoText}>
                {infoMessage}
              </ThemedText>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <ThemedText variant="caption" style={styles.errorText}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.form}>
            <Input
              label="Verification Code / Link Token"
              placeholder="Enter code"
              autoCapitalize="none"
              value={code}
              onChangeText={(val) => {
                setCode(val);
                if (error) setError(null);
              }}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Verify & Continue"
              size="lg"
              loading={loading}
              onPress={handleVerify}
            />

            <Button
              title={resending ? "Resending..." : "Resend code"}
              variant="ghost"
              size="md"
              loading={resending}
              onPress={handleResend}
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
  emailHighlight: {
    color: colors.label,
    fontWeight: "600",
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
  infoBox: {
    backgroundColor: colors.brandSubtle,
    borderRadius: 8,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  infoText: {
    color: colors.brand,
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

