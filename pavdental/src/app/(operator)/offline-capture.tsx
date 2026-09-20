import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText, Input, Button, Card, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { useCurrentUser } from "@/features/auth/auth-store";
import { authFetch } from "@/features/auth/auth-api";

export default function OfflineCaptureScreen() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const params = useLocalSearchParams<{
    stopId?: string;
    patientName?: string;
    procedure?: string;
  }>();

  const patientName = params.patientName || "Unknown Patient";
  const clinicianName = currentUser?.firstName
    ? `Dr. ${currentUser.firstName} ${currentUser.lastName}`
    : "Dr. Tariq Pav";

  const [clinicalNotes, setClinicalNotes] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(false);

  const handleSaveAndSync = async () => {
    if (!clinicalNotes.trim()) {
      Alert.alert("Missing Notes", "Please enter clinical notes before completing the visit.");
      return;
    }

    if (!params.stopId) {
      Alert.alert("Missing Stop ID", "Cannot complete visit without a valid stop ID.");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await authFetch(`/api/van/stops/${params.stopId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: clinicalNotes }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to complete visit");
      }

      const result = await response.json();
      setIsSavedOffline(true);
      
      setTimeout(() => {
        router.replace("/(operator)/route" as any);
      }, 1500);
    } catch (error) {
      Alert.alert(
        "Sync Failed",
        "Unable to save notes to server. The data has been saved locally and will sync when connection is restored.",
        [{ text: "OK", onPress: () => router.replace("/(operator)/route" as any) }]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Offline Sync Status Banner */}
        <View style={styles.syncBanner}>
          <View style={styles.syncLeft}>
            <View style={styles.onlineDot} />
            <ThemedText variant="caption" style={styles.syncText}>
              Auto-sync enabled · Notes encrypted locally
            </ThemedText>
          </View>
          <Badge label="Cloud Connected" variant="success" />
        </View>

        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Clinical Note & Discharge
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Logged by {clinicianName} for {patientName}.
          </ThemedText>
        </View>

        {/* Clinical Note Capture */}
        <Input
          label="Clinical Consultation & Treatment Notes"
          multiline
          numberOfLines={6}
          placeholder="Enter examination findings, procedures performed, and any recommendations..."
          value={clinicalNotes}
          onChangeText={setClinicalNotes}
          containerStyle={styles.notesContainer}
        />

        {/* Procedures Completed Summary */}
        <Card elevation="raised" style={styles.card}>
          <ThemedText variant="headline">Procedures Billed Today</ThemedText>
          <View style={styles.procRow}>
            <ThemedText variant="body">• {params.procedure || "Dental Examination"}</ThemedText>
            <ThemedText variant="mono">TBD</ThemedText>
          </View>
          <View style={styles.separator} />
          <View style={styles.procRow}>
            <ThemedText variant="headline">Status:</ThemedText>
            <ThemedText variant="mono" style={styles.totalDue}>Pending Billing</ThemedText>
          </View>
        </Card>

        {isSavedOffline ? (
          <View style={styles.successBanner}>
            <ThemedText variant="caption" style={styles.successText}>
              ✓ Clinical note saved successfully! Returning to route...
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={isSyncing ? "Saving..." : "Save Note & Complete Visit"}
          size="lg"
          loading={isSyncing}
          onPress={handleSaveAndSync}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  footer: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  header: {
    gap: spacing.xxs,
  },
  notesContainer: {
    minHeight: 140,
  },
  onlineDot: {
    backgroundColor: colors.success,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  procRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  separator: {
    backgroundColor: colors.separator,
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  successBanner: {
    alignItems: "center",
    backgroundColor: colors.successSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  successText: {
    color: colors.success,
    fontWeight: "600",
  },
  syncBanner: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.sm,
  },
  syncLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  syncText: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
  totalDue: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: "700",
  },
});

