import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button } from "@/components";
import { colors, spacing } from "@/theme";

export default function WaitingRoomScreen() {
  const router = useRouter();
  const [queuePosition] = useState(1);
  const estimatedWaitMins = 2;

  useEffect(() => {
    // Auto simulate clinician joining the call after 3 seconds
    const timer = setTimeout(() => {
      router.replace("/(patient)/video/call" as any);
    }, 3500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.center}>
          <View style={styles.spinnerCircle}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>

          <ThemedText variant="largeTitle" style={styles.title}>
            You're in the waiting room
          </ThemedText>

          <ThemedText variant="subhead" style={styles.subtitle}>
            Dr. Tariq Pav is reviewing your triage notes & photos and will connect with you shortly.
          </ThemedText>

          <Card elevation="raised" style={styles.queueCard}>
            <View style={styles.queueRow}>
              <ThemedText variant="subhead" style={styles.queueLabel}>
                Your Queue Position:
              </ThemedText>
              <ThemedText variant="headline" style={styles.queueVal}>
                #{queuePosition} in line
              </ThemedText>
            </View>

            <View style={styles.queueRow}>
              <ThemedText variant="subhead" style={styles.queueLabel}>
                Estimated Wait:
              </ThemedText>
              <ThemedText variant="headline" style={styles.queueVal}>
                ~{estimatedWaitMins} minutes
              </ThemedText>
            </View>
          </Card>

          <View style={styles.reassuranceBox}>
            <ThemedText variant="caption" style={styles.reassuranceText}>
              🔒 Video consultation uses encrypted transport. Independent security review required for production use.
            </ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
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
    gap: spacing.md,
    justifyContent: "center",
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  queueCard: {
    backgroundColor: colors.secondaryBackground,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    width: "100%",
  },
  queueLabel: {
    color: colors.secondaryLabel,
  },
  queueRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  queueVal: {
    color: colors.brand,
    fontWeight: "700",
  },
  reassuranceBox: {
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
    backgroundColor: colors.brandSubtle,
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 80,
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

