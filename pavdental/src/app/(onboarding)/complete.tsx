import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { useAuthStore } from "@/features/auth/auth-store";

export default function OnboardingCompleteScreen() {
  const router = useRouter();
  const { setAuth, user: existingUser, accessToken } = useAuthStore();

  const handleEnterApp = () => {
    if (!existingUser || !accessToken) {
      setAuth(accessToken || "local-patient-session", {
        id: existingUser?.id || "patient_registered",
        sub: existingUser?.id || "patient_registered",
        email: existingUser?.email || "patient@pavdental.co.uk",
        firstName: existingUser?.firstName || "Patient",
        lastName: existingUser?.lastName || "Member",
        role: "patient",
        emailVerified: true,
        phoneVerified: true,
        mfaEnabled: false,
        isMfaEnabled: false,
      });
    }
    router.replace("/(patient)/(tabs)/home");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <View style={styles.celebrationCircle}>
            <ThemedText variant="largeTitle" style={styles.checkEmoji}>
              🎉
            </ThemedText>
          </View>

          <ThemedText variant="largeTitle" style={styles.title}>
            You're all set!
          </ThemedText>

          <ThemedText variant="subhead" style={styles.subtitle}>
            Your profile and medical history have been securely logged. You can now book van visits, video consultations, and clinic visits instantly.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <Button
            title="Explore Pav Dental"
            size="lg"
            onPress={handleEnterApp}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: spacing.xl,
  },
  celebrationCircle: {
    alignItems: "center",
    backgroundColor: colors.brandSubtle,
    borderRadius: 48,
    height: 96,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 96,
  },
  centerBox: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
  },
  checkEmoji: {
    fontSize: 44,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
  title: {
    color: colors.label,
    textAlign: "center",
  },
});

