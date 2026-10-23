import React from "react";
import { View, StyleSheet, ScrollView, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText, Card, Badge, Button, AppIcon, EmptyState, Skeleton } from "@/components";
import { colors, spacing } from "@/theme";
import { usePatientPrescriptions } from "@/features/hooks/use-dental-api";
import { useCurrentUser } from "@/features/auth/auth-store";
import { normalizePrescription } from "../prescriptions";

export default function PrescriptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const userId = user?.id || "";
  const { data: rawList, isLoading } = usePatientPrescriptions(userId);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Skeleton height={96} />
          <Skeleton height={140} />
        </View>
      </View>
    );
  }

  const prescriptions = Array.isArray(rawList) ? rawList.map(normalizePrescription) : [];
  const rx = prescriptions.find((p) => p.id === id) || prescriptions[0];

  if (!rx) {
    return (
      <View style={styles.container}>
        <EmptyState
          heading="Prescription not found"
          body="This prescription may have been removed."
          actionLabel="Back to prescriptions"
          onAction={() => router.back()}
          icon="droplet"
        />
      </View>
    );
  }

  const issued = new Date(rx.issuedIso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Card elevation="raised" style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerIcon}>
              <AppIcon name="droplet" size={22} color={colors.onInk} />
            </View>
            <View style={styles.headerInfo}>
              <ThemedText variant="title">
                {rx.drugName} {rx.strength}
              </ThemedText>
              <ThemedText variant="caption" style={styles.muted}>
                {rx.form} · issued {issued}
              </ThemedText>
            </View>
            <Badge
              label={rx.status === "active" ? "ACTIVE" : "COMPLETED"}
              variant={rx.status === "active" ? "success" : "default"}
            />
          </View>
        </Card>

        {/* Dosage card */}
        <Card elevation="raised" style={styles.card}>
          <ThemedText variant="overline">How to take it</ThemedText>
          <View style={styles.detailRow}>
            <ThemedText variant="subhead" style={styles.detailLabel}>
              Dose
            </ThemedText>
            <ThemedText variant="subhead" style={styles.detailValue}>
              {rx.dosage}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <ThemedText variant="body" style={styles.detailLabel}>
              Course
            </ThemedText>
            <ThemedText variant="body" style={styles.detailValue}>
              {rx.course}
            </ThemedText>
          </View>
          {rx.epsReference ? (
            <View style={styles.detailRow}>
              <ThemedText variant="caption" style={styles.detailLabel}>
                EPS Token
              </ThemedText>
              <ThemedText variant="mono" style={styles.detailValue}>
                {rx.epsReference}
              </ThemedText>
            </View>
          ) : null}
          <View style={styles.notesBox}>
            <ThemedText variant="caption" style={styles.notesText}>
              {rx.notes}
            </ThemedText>
          </View>
        </Card>

        {/* Pharmacy + prescriber */}
        <Card elevation="raised" style={styles.card}>
          <View style={styles.pharmRow}>
            <AppIcon name="mapPin" size={15} color={colors.secondaryLabel} />
            <View style={styles.pharmInfo}>
              <ThemedText variant="subhead" style={styles.pharmName}>
                {rx.pharmacy}
              </ThemedText>
              <ThemedText variant="caption" style={styles.muted}>
                Prescribed by {rx.prescriber}
              </ThemedText>
            </View>
          </View>

          {rx.status === "active" ? (
            rx.refillsRemaining > 0 ? (
              <View style={styles.refillBox}>
                <AppIcon name="refresh" size={15} color={colors.success} />
                <ThemedText variant="caption" style={styles.refillText}>
                  {rx.refillsRemaining} refill{rx.refillsRemaining !== 1 ? "s" : ""} remaining — request from the practice.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.refillBoxDone}>
                <ThemedText variant="caption" style={styles.refillTextDone}>
                  Course in progress — contact the practice for a repeat.
                </ThemedText>
              </View>
            )
          ) : null}
        </Card>

        <Button
          title="Call the practice"
          variant="secondary"
          size="lg"
          accessibilityLabel="Call Pav Dental practice"
          onPress={() => Linking.openURL("tel:+442070000000").catch(() => {})}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  detailLabel: {
    color: colors.secondaryLabel,
    width: 70,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  detailValue: {
    color: colors.label,
    flex: 1,
  },
  headerCard: {
    padding: spacing.md,
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  muted: {
    color: colors.secondaryLabel,
  },
  notesBox: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    padding: spacing.sm,
  },
  notesText: {
    color: colors.label,
    lineHeight: 17,
  },
  pharmInfo: {
    flex: 1,
    gap: 2,
  },
  pharmName: {
    color: colors.label,
  },
  pharmRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  refillBox: {
    alignItems: "center",
    backgroundColor: colors.successSubtle,
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xxs,
    padding: spacing.sm,
  },
  refillBoxDone: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    padding: spacing.sm,
  },
  refillText: {
    color: colors.success,
    flex: 1,
    fontWeight: "600",
  },
  refillTextDone: {
    color: colors.secondaryLabel,
  },
});
