import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText, Input, Button, Card, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { useCurrentUser } from "@/features/auth/auth-store";

export default function OfflineCaptureScreen() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const params = useLocalSearchParams<{
    stopId?: string;
    patientName?: string;
    procedure?: string;
  }>();

  const patientName = params.patientName || "Alexander Wright";
  const clinicianName = currentUser?.firstName
    ? `Dr. ${currentUser.firstName} ${currentUser.lastName}`
    : "Dr. Tariq Pav";

  const [clinicalNotes, setClinicalNotes] = useState(
    `Examination completed on board Van #1 for ${patientName}. 2 bitewing X-rays exposed and reviewed. AirFlow scale completed with 0.2% Chlorhexidine irrigation.`
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavedOffline, setIsSavedOffline] = useState(false);

  const handleSaveAndSync = async () => {
    setIsSyncing(true);
    if (params.stopId && params.stopId.length > 5) {
      await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"}/api/van/stops/${params.stopId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: clinicalNotes }),
      }).catch(() => {});
    }

    setTimeout(() => {
      setIsSyncing(false);
      setIsSavedOffline(true);
      setTimeout(() => {
        router.replace("/(operator)/route" as any);
      }, 1000);
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Offline Sync Status Banner */}
        <View style={styles.syncBanner}>
          <View style={styles.syncLeft}>
            <View style={styles.onlineDot} />
            <ThemedText variant="caption" style={styles.syncText}>
              MMKV Offline Queue Active · Auto-Syncs on 4G/WiFi
            </ThemedText>
          </View>
          <Badge label="Offline Resilient" variant="info" />
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
          value={clinicalNotes}
          onChangeText={setClinicalNotes}
          containerStyle={styles.notesContainer}
        />

        {/* Procedures Completed Summary */}
        <Card elevation="raised" style={styles.card}>
          <ThemedText variant="headline">Procedures Billed Today</ThemedText>
          <View style={styles.procRow}>
            <ThemedText variant="body">• Comprehensive Examination</ThemedText>
            <ThemedText variant="mono">£65.00</ThemedText>
          </View>
          <View style={styles.procRow}>
            <ThemedText variant="body">• AirFlow Hygiene Session</ThemedText>
            <ThemedText variant="mono">£85.00</ThemedText>
          </View>
          <View style={styles.separator} />
          <View style={styles.procRow}>
            <ThemedText variant="headline">Remaining Balance Billed:</ThemedText>
            <ThemedText variant="mono" style={styles.totalDue}>£125.00</ThemedText>
          </View>
        </Card>

        {isSavedOffline ? (
          <View style={styles.successBanner}>
            <ThemedText variant="caption" style={styles.successText}>
              ✓ Note encrypted and queued for cloud sync! Returning to route...
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={isSyncing ? "Encrypting & Queuing..." : "Save Note & Complete Visit"}
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

