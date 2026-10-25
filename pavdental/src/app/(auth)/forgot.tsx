import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button, IconButton, AppIcon } from "@/components";
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
        <View style={styles.topNav}>
          <IconButton
            icon="chevronLeft"
            label="Go back"
            variant="soft"
            size={18}
            onPress={() => router.back()}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText variant="largeTitle" style={styles.title}>
              Reset password
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
              <View style={styles.successIconBox}>
                <AppIcon name="check" size={20} color={colors.success} />
              </View>
              <View style={styles.successTextCol}>
                <ThemedText variant="headline" style={styles.successTitle}>
                  Check your inbox
                </ThemedText>
                <ThemedText variant="subhead" style={styles.successBody}>
                  Follow the instructions in the email to choose a new password. The link will expire in 30 minutes.
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.actions}>
            {!submitted ? (
              <Button
                title="Send Reset Instructions"
                size="lg"
                arrow={true}
                loading={loading}
                onPress={handleSubmit}
              />
            ) : null}

            <Button
              title="Return to Sign In"
              variant={submitted ? "primary" : "ghost"}
              size="lg"
              arrow={submitted}
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
    paddingTop: spacing.sm,
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
    marginTop: spacing.xs,
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
    paddingTop: spacing.xs,
  },
  subtitle: {
    color: colors.secondaryLabel,
    fontSize: 15,
    lineHeight: 22,
  },
  successBody: {
    color: colors.secondaryLabel,
    fontSize: 13,
    lineHeight: 18,
  },
  successCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.separator,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md + 2,
    alignItems: "flex-start",
  },
  successIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.successSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  successTextCol: {
    flex: 1,
    gap: 2,
  },
  successTitle: {
    color: colors.label,
    fontWeight: "700",
  },
  title: {
    color: colors.label,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  topNav: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
