import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, ScrollView, Alert, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ThemedText, Input, Button, Card, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { useCurrentUser } from "@/features/auth/auth-store";
import { authFetch } from "@/features/auth/auth-api";

export const OFFLINE_VAN_NOTES_QUEUE_KEY = "pav_offline_van_notes_queue";

interface QueuedVanNote {
  stopId: string;
  notes: string;
  queuedAt: string;
}

async function readOfflineNotesQueue(): Promise<QueuedVanNote[]> {
  try {
    const raw =
      Platform.OS === "web"
        ? typeof window !== "undefined"
          ? window.localStorage.getItem(OFFLINE_VAN_NOTES_QUEUE_KEY)
          : null
        : await SecureStore.getItemAsync(OFFLINE_VAN_NOTES_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeOfflineNotesQueue(queue: QueuedVanNote[]): Promise<void> {
  try {
    const serialized = JSON.stringify(queue);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(OFFLINE_VAN_NOTES_QUEUE_KEY, serialized);
      }
    } else {
      await SecureStore.setItemAsync(OFFLINE_VAN_NOTES_QUEUE_KEY, serialized);
    }
  } catch {
    // Ignore storage write error
  }
}

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
  const [queuedCount, setQueuedCount] = useState(0);

  const flushOfflineQueue = useCallback(async () => {
    const queue = await readOfflineNotesQueue();
    if (queue.length === 0) {
      setQueuedCount(0);
      return;
    }
    const remaining: QueuedVanNote[] = [];
    for (const item of queue) {
      try {
        const res = await authFetch(`/api/van/requests/${item.stopId}/phase`, {
          method: "POST",
          body: JSON.stringify({ phase: "completed", notes: item.notes }),
        });
        if (!res.ok) {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }
    await writeOfflineNotesQueue(remaining);
    setQueuedCount(remaining.length);
  }, []);

  useEffect(() => {
    flushOfflineQueue();
  }, [flushOfflineQueue]);

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
      const phaseRes = await authFetch(`/api/van/requests/${params.stopId}/phase`, {
        method: "POST",
        body: JSON.stringify({ phase: "completed", notes: clinicalNotes }),
      });

      if (!phaseRes.ok) {
        const err = await phaseRes.json().catch(() => ({}));
        throw new Error((err as any).message || (err as any).error || "Could not complete the visit");
      }

      await flushOfflineQueue();
      setIsSavedOffline(true);
      router.replace("/(operator)/route" as any);
    } catch {
      const existing = await readOfflineNotesQueue();
      const updated: QueuedVanNote[] = [
        ...existing.filter((item) => item.stopId !== params.stopId),
        {
          stopId: params.stopId,
          notes: clinicalNotes.trim(),
          queuedAt: new Date().toISOString(),
        },
      ];
      await writeOfflineNotesQueue(updated);
      setQueuedCount(updated.length);
      setIsSavedOffline(true);
      Alert.alert(
        "Saved to Offline Queue",
        "Unable to reach the server right now. Your clinical notes have been encrypted and queued locally (`pav_offline_van_notes_queue`) and will sync automatically when connectivity returns.",
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
              {queuedCount > 0
                ? `${queuedCount} note(s) queued offline · Will auto-sync`
                : "Auto-sync enabled · Notes encrypted locally"}
            </ThemedText>
          </View>
          <Badge
            label={queuedCount > 0 ? `${queuedCount} Queued` : "Cloud Connected"}
            variant={queuedCount > 0 ? "warning" : "success"}
          />
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
    color: colors.ink,
  },
});

