import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert, Modal } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ThemedText, Card, ListRow, Button, Badge } from "@/components";
import { ToggleSwitch } from "@/components/settings/ToggleSwitch";
import { PasswordChangeForm, PasswordChangeFormData } from "@/components/forms/PasswordChangeForm";
import { useBiometrics } from "@/features/security/biometric-hooks";
import { useCurrentUser } from "@/features/auth/auth-store";
import { useChangePasswordMutation, useResendVerificationMutation } from "@/features/account/account-hooks";
import { colors, spacing } from "@/theme";

export default function SecurityScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const {
    isSupported,
    isEnrolled,
    biometricType,
    isBiometricLockEnabled,
    toggleBiometricLock,
  } = useBiometrics();

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const changePassword = useChangePasswordMutation();
  const resendVerification = useResendVerificationMutation();

  const handleToggleBiometric = async (value: boolean) => {
    const success = await toggleBiometricLock(value);
    if (success) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics optional
      }
    }
  };

  const handlePasswordSubmit = async (data: PasswordChangeFormData) => {
    try {
      await changePassword.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics optional
      }

      Alert.alert("Password Updated", "Your account password has been successfully updated.", [
        {
          text: "Done",
          onPress: () => setPasswordModalVisible(false),
        },
      ]);
    } catch (err: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Haptics optional
      }
      Alert.alert("Failed to Update Password", err?.message || "Please check your current password.");
    }
  };

  const handleResendEmail = async () => {
    try {
      const res = await resendVerification.mutateAsync();
      Alert.alert("Email Sent", res.message || "A verification link has been sent to your inbox.");
    } catch {
      Alert.alert("Error", "Could not send verification email. Please try again later.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Biometric App Lock */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          BIOMETRIC PROTECTION
        </ThemedText>
        <ToggleSwitch
          label={`${biometricType} App Lock`}
          description={
            isSupported
              ? isEnrolled
                ? `Require ${biometricType} every time you open Pav Dental`
                : "No biometrics registered on this device"
              : "Biometric hardware not available on this device"
          }
          value={isBiometricLockEnabled}
          onValueChange={handleToggleBiometric}
          disabled={!isSupported || !isEnrolled}
          icon={<ThemedText>🔐</ThemedText>}
        />
      </View>

      {/* Account Security */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          LOGIN & PASSWORDS
        </ThemedText>
        <Card padding="none">
          <ListRow
            title="Change Account Password"
            subtitle="Update your master security password"
            left={<ThemedText>🔑</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => setPasswordModalVisible(true)}
            separator
          />
          <ListRow
            title="Active Logged-in Sessions"
            subtitle="View devices and sign out other sessions"
            left={<ThemedText>📱</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/(tabs)/profile/sessions" as any)}
          />
        </Card>
      </View>

      {/* Email Verification Status */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          VERIFIED IDENTITY
        </ThemedText>
        <View style={styles.verifyCard}>
          <View style={styles.verifyRow}>
            <View style={styles.verifyInfo}>
              <ThemedText variant="headline">{user?.email}</ThemedText>
              <ThemedText variant="caption" style={styles.verifySub}>
                {user?.emailVerified ? "Primary email is verified" : "Email address requires verification"}
              </ThemedText>
            </View>
            <Badge
              variant={user?.emailVerified ? "success" : "warning"}
              label={user?.emailVerified ? "Verified" : "Pending"}
            />
          </View>
          {!user?.emailVerified && (
            <Button
              title={resendVerification.isPending ? "Sending..." : "Resend Verification Email"}
              variant="secondary"
              size="sm"
              onPress={handleResendEmail}
              disabled={resendVerification.isPending}
            />
          )}
        </View>
      </View>

      {/* DSPT & GDPR Compliance */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          DATA PRIVACY & LEGAL
        </ThemedText>
        <Card padding="none">
          <ListRow
            title="Consent & Data Usage"
            subtitle="Signed GDPR records & retention disclosures"
            left={<ThemedText>📄</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/(tabs)/profile/consent" as any)}
            separator
          />
          <ListRow
            title="Encryption Standards"
            subtitle="Development prototype - independent security review required for production"
            left={<ThemedText>🛡️</ThemedText>}
          />
        </Card>
      </View>

      {/* Password Change Modal */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText variant="headline">Change Password</ThemedText>
            <Button
              title="Close"
              variant="ghost"
              size="sm"
              onPress={() => setPasswordModalVisible(false)}
            />
          </View>
          <PasswordChangeForm
            onSubmit={handlePasswordSubmit}
            isLoading={changePassword.isPending}
            onCancel={() => setPasswordModalVisible(false)}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  modalContainer: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  modalHeader: {
    alignItems: "center",
    borderBottomColor: colors.separator,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.secondaryLabel,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  verifyCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    gap: spacing.sm,
    padding: spacing.md,
  },
  verifyInfo: {
    flex: 1,
    gap: 2,
  },
  verifyRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  verifySub: {
    color: colors.secondaryLabel,
  },
});

