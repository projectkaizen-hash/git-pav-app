import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { authApi } from "@/features/auth/auth-api";

export default function OtpScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setError("Please enter your UK mobile number.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authApi.requestPhoneOtp(phone.trim());
      setStep("code");
    } catch (err: any) {
      setError(err?.message || "Failed to send code. Please check your number.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim() || code.length < 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authApi.verifyPhoneOtp(phone.trim(), code.trim());
      // On success, redirect is handled by auth layout listener
    } catch (err: any) {
      setError(err?.message || "Invalid or expired code. Please try again.");
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
              {step === "phone" ? "Phone Sign In" : "Enter Verification Code"}
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              {step === "phone"
                ? "We'll text you a one-time 6-digit security code."
                : `Enter the 6-digit code sent to ${phone}`}
            </ThemedText>
          </View>

          {error ? (
            <View style={styles.errorBox} accessibilityRole="alert">
              <ThemedText variant="caption" style={styles.errorText}>
                {error}
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.form}>
            {step === "phone" ? (
              <Input
                label="UK Mobile Phone"
                placeholder="+44 7123 456789"
                keyboardType="phone-pad"
                autoComplete="tel"
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  if (error) setError(null);
                }}
              />
            ) : (
              <>
                <Input
                  label="6-Digit Code"
                  placeholder="123456"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={code}
                  onChangeText={(val) => {
                    setCode(val);
                    if (error) setError(null);
                  }}
                />
                <Pressable
                  onPress={() => setStep("phone")}
                  style={styles.changePhonePressable}
                >
                  <ThemedText variant="caption" style={styles.changePhoneText}>
                    Change phone number
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.actions}>
            <Button
              title={step === "phone" ? "Send Code" : "Verify & Continue"}
              size="lg"
              loading={loading}
              onPress={step === "phone" ? handleSendCode : handleVerifyCode}
            />

            <Button
              title="Back to Email Sign In"
              variant="ghost"
              size="md"
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
  changePhonePressable: {
    paddingVertical: spacing.xxs,
  },
  changePhoneText: {
    color: colors.brand,
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

