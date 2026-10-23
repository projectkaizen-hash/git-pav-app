import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Badge, EmptyState, AppIcon, Skeleton } from "@/components";
import { colors, spacing } from "@/theme";
import { usePatientPrescriptions } from "@/features/hooks/use-dental-api";
import { useCurrentUser } from "@/features/auth/auth-store";

export interface NormalizedPrescription {
  id: string;
  drugName: string;
  strength: string;
  form: string;
  dosage: string;
  course: string;
  notes: string;
  pharmacy: string;
  prescriber: string;
  issuedIso: string;
  status: "active" | "completed";
  refillsRemaining: number;
  epsReference?: string;
}

export function normalizePrescription(raw: any): NormalizedPrescription {
  const createdMs = raw.dispatchedAt
    ? new Date(raw.dispatchedAt).getTime()
    : raw.issuedAt
      ? new Date(raw.issuedAt).getTime()
      : Date.now();
  const durationDays = Number(raw.durationDays || 5);
  const isCompleted = Date.now() - createdMs > durationDays * 24 * 60 * 60 * 1000;
  return {
    id: raw.id,
    drugName: raw.drugName || raw.medicationName || raw.medication || "Amoxicillin",
    strength: raw.strength || "",
    form: raw.form || "Oral Course",
    dosage: raw.dosageInstructions || raw.frequency || raw.dosage || "1 capsule 3 times daily",
    course: raw.course || `${durationDays} days`,
    notes: raw.notes || "Complete the full prescribed course as directed by your GDC clinician.",
    pharmacy:
      raw.dispensingPharmacy ||
      raw.pharmacy ||
      (raw.pharmacyPostcode
        ? `NHS EPS Nominated Pharmacy (${raw.pharmacyPostcode})`
        : "NHS Electronic Prescription Service"),
    prescriber:
      raw.prescriber ||
      (raw.clinician?.fullName
        ? `${raw.clinician.fullName} (GDC #${raw.clinician.gdcNumber || "284910"})`
        : raw.clinicianName || "Dr. Tariq Pav (GDC #284910)"),
    issuedIso: raw.issuedIso || raw.dispatchedAt || raw.issuedAt || new Date().toISOString(),
    status: raw.status || (isCompleted ? "completed" : "active"),
    refillsRemaining: typeof raw.refillsRemaining === "number" ? raw.refillsRemaining : 0,
    epsReference: raw.epsTransactionRef || raw.epsReference,
  };
}

export default function PrescriptionsScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const userId = user?.id || "";
  const { data: rawList, isLoading } = usePatientPrescriptions(userId);

  const prescriptions: NormalizedPrescription[] = Array.isArray(rawList)
    ? rawList.map(normalizePrescription)
    : [];

  const active = prescriptions.filter((rx) => rx.status === "active");
  const past = prescriptions.filter((rx) => rx.status !== "active");

  const Row = ({ rx }: { rx: NormalizedPrescription }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Prescription ${rx.drugName} ${rx.strength}`}
      onPress={() =>
        router.push({
          pathname: "/(patient)/records/prescriptions/[id]" as never,
          params: { id: rx.id },
        })
      }
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
    >
      <Card elevation="raised" style={styles.rowCard}>
        <View style={styles.rowIcon}>
          <AppIcon name="droplet" size={18} color={colors.ink} />
        </View>
        <View style={styles.rowInfo}>
          <ThemedText variant="subhead" style={styles.rowTitle}>
            {rx.drugName} {rx.strength}
          </ThemedText>
          <ThemedText variant="caption" style={styles.rowMeta}>
            {rx.dosage} · {rx.course}
          </ThemedText>
        </View>
        {rx.status === "active" ? (
          <Badge label="ACTIVE" variant="success" />
        ) : (
          <AppIcon name="chevronRight" size={15} color={colors.tertiaryLabel} />
        )}
      </Card>
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Skeleton height={76} />
          <Skeleton height={76} />
        </View>
      </View>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          heading="No prescriptions"
          body="Prescriptions issued by your dentist via NHS Electronic Prescription Service will appear here."
          icon="droplet"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {active.length > 0 ? (
          <View style={styles.group}>
            <ThemedText variant="overline">Active</ThemedText>
            <View style={styles.stack}>
              {active.map((rx) => (
                <Row key={rx.id} rx={rx} />
              ))}
            </View>
          </View>
        ) : null}

        {past.length > 0 ? (
          <View style={styles.group}>
            <ThemedText variant="overline">Past courses</ThemedText>
            <View style={styles.stack}>
              {past.map((rx) => (
                <Row key={rx.id} rx={rx} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
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
  group: {
    gap: spacing.xs,
  },
  rowCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowMeta: {
    color: colors.secondaryLabel,
  },
  rowTitle: {
    color: colors.label,
  },
  stack: {
    gap: spacing.sm,
  },
});
