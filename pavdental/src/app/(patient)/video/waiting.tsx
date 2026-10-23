import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText, Card, Button, AppIcon, Badge } from "@/components";
import { colors, spacing, radius } from "@/theme";
import { authFetch } from "@/features/auth/auth-api";

export default function WaitingRoomScreen() {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const [statusLabel, setStatusLabel] = useState("Ready to Connect");

  useEffect(() => {
    let active = true;
    async function pollRoomStatus() {
      if (!appointmentId) return;
      try {
        const res = await authFetch(`/api/video/status/${appointmentId}`);
        if (!active || !res.ok) return;
        const data = await res.json();
        if (data?.admitted || data?.status === "in_progress" || data?.status === "IN_PROGRESS") {
          setStatusLabel("Clinician Admitted You");
          router.replace({
            pathname: "/(patient)/video/call" as any,
            params: { appointmentId, roomUrl: data?.roomUrl || "" },
          });
        }
      } catch {
        // Ignore transient network errors while polling
      }
    }
    pollRoomStatus();
    const interval = setInterval(pollRoomStatus, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [appointmentId, router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.center}>
          <View style={styles.spinnerCircle}>
            <ActivityIndicator size="large" color={colors.ink} />
          </View>

          <ThemedText variant="largeTitle" style={styles.title}>
            Telehealth Waiting Room
          </ThemedText>

          <ThemedText variant="subhead" style={styles.subtitle}>
            Dr. Tariq Pav is reviewing your triage notes & photos and will connect with you in a moment.
          </ThemedText>

          {/* Consultation Pre-flight Checklist */}
          <Card elevation="raised" style={styles.queueCard}>
            <View style={styles.queueHeaderRow}>
              <ThemedText variant="headline" style={styles.queueCardTitle}>
                Consultation Ready
              </ThemedText>
              <Badge label={statusLabel} variant="success" />
            </View>

            <View style={styles.checklist}>
              <View style={styles.checkItem}>
                <View style={styles.checkIconSuccess}>
                  <AppIcon name="check" size={14} color={colors.alwaysWhite} />
                </View>
                <View style={styles.checkTextGroup}>
                  <ThemedText variant="subhead" style={styles.checkTitle}>
                    Camera & Audio Verified
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.muted}>
                    Front camera HD · Microphone active
                  </ThemedText>
                </View>
              </View>

              <View style={styles.checkItem}>
                <View style={styles.checkIconSuccess}>
                  <AppIcon name="check" size={14} color={colors.alwaysWhite} />
                </View>
                <View style={styles.checkTextGroup}>
                  <ThemedText variant="subhead" style={styles.checkTitle}>
                    Pre-consult Triage
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.muted}>
                    4 photos attached · Severe toothache #31
                  </ThemedText>
                </View>
              </View>

              <View style={styles.checkItem}>
                <View style={styles.checkIconPending}>
                  <ActivityIndicator size="small" color={colors.ink} />
                </View>
                <View style={styles.checkTextGroup}>
                  <ThemedText variant="subhead" style={styles.checkTitle}>
                    Clinician Connection
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.muted}>
                    Dr. Tariq Pav is entering the room...
                  </ThemedText>
                </View>
              </View>
            </View>
          </Card>

          <View style={styles.reassuranceBox}>
            <AppIcon name="lock" size={14} color={colors.secondaryLabel} />
            <ThemedText variant="caption" style={styles.reassuranceText}>
              256-bit WebRTC end-to-end encrypted · NHS Digital & CQC compliant
            </ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Join Call Now ›"
            size="lg"
            onPress={() => router.replace("/(patient)/video/call" as any)}
          />
          <Button
            title="Cancel & Leave Waiting Room"
            variant="ghost"
            size="md"
            onPress={() => router.replace("/(patient)/(tabs)/home")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
  },
  center: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
  },
  checkIconPending: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkIconSuccess: {
    alignItems: "center",
    backgroundColor: colors.success,
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  checkTextGroup: {
    flex: 1,
    gap: 1,
  },
  checkTitle: {
    color: colors.label,
    fontWeight: "600",
  },
  checklist: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  muted: {
    color: colors.secondaryLabel,
  },
  queueCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    width: "100%",
  },
  queueCardTitle: {
    color: colors.label,
  },
  queueHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reassuranceBox: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  reassuranceText: {
    color: colors.secondaryLabel,
    lineHeight: 16,
    textAlign: "center",
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  spinnerCircle: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 40,
    height: 72,
    justifyContent: "center",
    marginBottom: spacing.xxs,
    width: 72,
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
  title: {
    color: colors.label,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
  },
});

