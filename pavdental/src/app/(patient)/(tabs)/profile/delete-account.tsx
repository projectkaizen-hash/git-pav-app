import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ThemedText, Card, Button, Input } from "@/components";
import { useDeleteAccountMutation } from "@/features/account/account-hooks";
import { colors, spacing } from "@/theme";

export default function DeleteAccountScreen() {
  const router = useRouter();
  const deleteAccount = useDeleteAccountMutation();
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");

  const handleDelete = () => {
    if (confirmText !== "DELETE") {
      Alert.alert("Confirmation Required", 'Please type "DELETE" into the box to confirm account closure.');
      return;
    }

    Alert.alert(
      "Final Confirmation",
      "Are you absolutely certain? This will immediately revoke your account access and sign you out.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Permanently Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount.mutateAsync({
                reason: reason || "User requested account closure",
                confirmPassword: password,
              });

              try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              } catch {
                // optional
              }

              Alert.alert("Account Closed", "Your account has been deleted. You have been signed out.", [
                {
                  text: "OK",
                  onPress: () => {
                    router.replace("/(auth)/welcome");
                  },
                },
              ]);
            } catch (err: any) {
              Alert.alert("Error", err?.message || "Failed to delete account. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Warning Banner */}
      <View style={styles.warningCard}>
        <ThemedText style={styles.warningIcon}>⚠️</ThemedText>
        <View style={styles.warningTextWrap}>
          <ThemedText variant="headline" style={styles.warningTitle}>
            Irreversible Account Closure
          </ThemedText>
          <ThemedText variant="caption" style={styles.warningSub}>
            Deleting your account will immediately cancel any pending appointments, disable portal access, and revoke mobile authentication.
          </ThemedText>
        </View>
      </View>

      {/* Statutory Retention Notice */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          STATUTORY HEALTH RECORDS RETENTION
        </ThemedText>
        <Card style={styles.retentionCard}>
          <ThemedText variant="caption" style={styles.retentionText}>
            Under General Dental Council (GDC) standards and NHS/Private Dental legislation, clinical records (including radiographs, odontograms, prescription notes, and diagnostic images) must be securely retained for 11 years (or until age 25 for pediatric patients) from the date of last treatment.
          </ThemedText>
          <ThemedText variant="caption" style={styles.retentionText}>
            Your digital login and marketing permissions will be terminated immediately. Clinical audit logs remain sealed.
          </ThemedText>
        </Card>
      </View>

      {/* Feedback / Reason */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          REASON FOR LEAVING (OPTIONAL)
        </ThemedText>
        <Input
          placeholder="Help us improve our service..."
          value={reason}
          onChangeText={setReason}
          multiline
        />
      </View>

      {/* Confirmation Input */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          TYPE "DELETE" TO CONFIRM
        </ThemedText>
        <Input
          placeholder="DELETE"
          autoCapitalize="characters"
          value={confirmText}
          onChangeText={setConfirmText}
        />

        <Input
          label="Account Password"
          placeholder="Verify account password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Action Button */}
      <View style={styles.actions}>
        <Button
          title={deleteAccount.isPending ? "Closing account..." : "Permanently Delete Account"}
          variant="destructive"
          onPress={handleDelete}
          disabled={confirmText !== "DELETE" || deleteAccount.isPending}
          loading={deleteAccount.isPending}
        />
        <Button
          title="Keep My Account"
          variant="secondary"
          onPress={() => router.back()}
          disabled={deleteAccount.isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  retentionCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    gap: spacing.xs,
    padding: spacing.md,
  },
  retentionText: {
    color: colors.secondaryLabel,
    lineHeight: 18,
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
  warningCard: {
    backgroundColor: colors.dangerSubtle,
    borderColor: colors.danger,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  warningIcon: {
    fontSize: 24,
  },
  warningSub: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  warningTextWrap: {
    flex: 1,
    gap: 2,
  },
  warningTitle: {
    color: colors.danger,
  },
});

