import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { ThemedText, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { useAuthStore } from "@/features/auth/auth-store";

export default function BiometricUnlockScreen() {
  const router = useRouter();
  const { setBiometricUnlocked } = useAuthStore();
  const [hasHardware, setHasHardware] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSupport() {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasHardware(compatible && enrolled);
      if (compatible && enrolled) {
        authenticate();
      }
    }
    checkSupport();
  }, []);

  const authenticate = async () => {
    try {
      setError(null);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock Pav Dental with Face ID / Biometrics",
        fallbackLabel: "Use Passcode",
      });

      if (result.success) {
        setBiometricUnlocked(true);
        router.replace("/(patient)/(tabs)/home");
      } else {
        setError("Authentication was canceled or not recognized.");
      }
    } catch {
      setError("Biometric authentication encountered an error.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <View style={styles.iconPlaceholder}>
            <ThemedText variant="largeTitle">🔒</ThemedText>
          </View>
          <ThemedText variant="title" style={styles.title}>
            App Locked
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Please authenticate to view your sensitive dental and health records.
          </ThemedText>

          {error ? (
            <ThemedText variant="caption" style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.actions}>
          {hasHardware ? (
            <Button
              title="Unlock with Biometrics"
              size="lg"
              onPress={authenticate}
            />
          ) : null}

          <Button
            title="Sign Out"
            variant="ghost"
            size="md"
            onPress={() => router.replace("/(auth)/sign-in")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  centerBox: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
  },
  iconPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 80,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  subtitle: {
    color: colors.secondaryLabel,
    paddingHorizontal: spacing.lg,
    textAlign: "center",
  },
  title: {
    color: colors.label,
  },
});

