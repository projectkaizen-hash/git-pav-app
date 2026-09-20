import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText, Input, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { authApi } from "@/features/auth/auth-api";

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(params.email || "");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError("Please fill out all required fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call backend API to create account
      await authApi.register(
        email.trim(),
        password,
        firstName.trim(),
        lastName.trim(),
        phone.trim() || undefined
      );

      // Navigate to email verification screen
      router.push({
        pathname: "/(auth)/verify-email",
        params: { email: email.trim() },
      });
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
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
              Create Account
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              Complete registration details for{" "}
              <ThemedText variant="subhead" style={styles.emailHighlight}>
                {email || "your account"}
              </ThemedText>
              .
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
            <View style={styles.row}>
              <View style={styles.flex}>
                <Input
                  label="First name"
                  placeholder="Jane"
                  value={firstName}
                  onChangeText={(val) => {
                    setFirstName(val);
                    if (error) setError(null);
                  }}
                />
              </View>
              <View style={styles.flex}>
                <Input
                  label="Last name"
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={(val) => {
                    setLastName(val);
                    if (error) setError(null);
                  }}
                />
              </View>
            </View>

            <Input
              label="Email address"
              placeholder="jane.doe@example.co.uk"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={(val) => {
                setEmail(val);
                if (error) setError(null);
              }}
            />

            <Input
              label="UK Mobile number (Optional)"
              placeholder="+44 7123 456789"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(val) => {
                setPhone(val);
                if (error) setError(null);
              }}
            />

            <Input
              label="Password"
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              hint="Use numbers, letters & symbols for strength"
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (error) setError(null);
              }}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Create Account"
              size="lg"
              loading={loading}
              onPress={handleRegister}
            />

            <View style={styles.footerRow}>
              <ThemedText variant="subhead" style={styles.footerLabel}>
                Already registered?{" "}
              </ThemedText>
              <Pressable onPress={() => router.push("/(auth)/sign-in")}>
                <ThemedText variant="subhead" style={styles.footerLink}>
                  Sign in
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
  form: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
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

