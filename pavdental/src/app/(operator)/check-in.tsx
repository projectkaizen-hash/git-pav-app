import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText, Card, Button, Badge } from "@/components";
import { colors, spacing } from "@/theme";

export default function OperatorCheckInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stopId?: string;
    patientName?: string;
    address?: string;
    procedure?: string;
  }>();

  const patientName = params.patientName || "Alexander Wright";
  const address = params.address || "14 Harley Street, London, W1G 9PQ";
  const procedure = params.procedure || "Comprehensive Exam & AirFlow Hygiene";

  const [vanParked, setVanParked] = useState(false);
  const [patientBoarded, setPatientBoarded] = useState(false);

  const handleStartTreatment = async () => {
    if (params.stopId && params.stopId.length > 5) {
      fetch(`${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"}/api/van/stops/${params.stopId}/check-in`, {
        method: "POST",
      }).catch(() => {});
    }

    router.push({
      pathname: "/(operator)/offline-capture" as any,
      params: {
        stopId: params.stopId,
        patientName,
        procedure,
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Arrival & Patient Boarding
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            {address} · {patientName}
          </ThemedText>
        </View>

        {/* Access Checklist */}
        <Card elevation="raised" style={styles.card}>
          <ThemedText variant="headline" style={styles.cardTitle}>
            On-Site Operational Checklist
          </ThemedText>

          <View style={styles.checkItem}>
            <View style={styles.checkInfo}>
              <ThemedText variant="body">1. Vehicle Safely Positioned</ThemedText>
              <ThemedText variant="caption" style={styles.sub}>
                Handbrake engaged, levelling stabilisers deployed.
              </ThemedText>
            </View>
            <Button
              title={vanParked ? "✓ Secured" : "Confirm"}
              size="sm"
              variant={vanParked ? "secondary" : "primary"}
              onPress={() => setVanParked(true)}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.checkItem}>
            <View style={styles.checkInfo}>
              <ThemedText variant="body">2. Patient Boarded In Surgery</ThemedText>
              <ThemedText variant="caption" style={styles.sub}>
                Patient welcomed inside surgery bay, seated in dental chair.
              </ThemedText>
            </View>
            <Button
              title={patientBoarded ? "✓ Seated" : "Confirm"}
              size="sm"
              variant={patientBoarded ? "secondary" : "primary"}
              onPress={() => setPatientBoarded(true)}
            />
          </View>
        </Card>

        {/* Patient Clinical Profile Snapshot */}
        <Card elevation="raised" style={styles.card}>
          <View style={styles.rowBetween}>
            <ThemedText variant="headline">Patient Clinical Flags</ThemedText>
            <Badge label="Allergies Recorded" variant="warning" />
          </View>
          <ThemedText variant="caption" style={styles.flagText}>
            ⚠️ Penicillin allergy noted on file.
          </ThemedText>
          <ThemedText variant="caption" style={styles.flagText}>
            🦷 Chief complaint: Occlusal sensitivity on LR7.
          </ThemedText>
        </Card>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Commence Treatment & Open Chart ›"
          size="lg"
          disabled={!vanParked || !patientBoarded}
          onPress={handleStartTreatment}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.label,
  },
  checkInfo: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  checkItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xxs,
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
  flagText: {
    color: colors.label,
    fontWeight: "500",
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
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  separator: {
    backgroundColor: colors.separator,
    height: StyleSheet.hairlineWidth,
  },
  sub: {
    color: colors.secondaryLabel,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});

