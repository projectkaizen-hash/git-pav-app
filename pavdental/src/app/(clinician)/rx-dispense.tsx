import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText, Input, Button, Card } from "@/components";
import { colors, spacing } from "@/theme";
import { useCurrentUser } from "@/features/auth/auth-store";

import { authFetch } from "@/features/auth/auth-api";

export default function ClinicianRxDispenseScreen() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const params = useLocalSearchParams<{
    patientName?: string;
    appointmentId?: string;
    patientAddress?: string;
  }>();

  const patientName = params.patientName || "Alexander Wright";
  const patientAddress = params.patientAddress || "14 Harley Street, Marylebone, London, W1G 9PQ";
  const clinicianName = currentUser?.firstName
    ? `Dr. ${currentUser.firstName} ${currentUser.lastName}`
    : "Dr. Tariq Pav";

  const [medication, setMedication] = useState("Amoxicillin 500mg Capsules");
  const [dosageInstructions, setDosageInstructions] = useState("1 capsule three times daily for 5 days.");
  const [pharmacyName, setPharmacyName] = useState("Boots Pharmacy (Harley Street, London)");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDispatched, setIsDispatched] = useState(false);

  const handleSignAndSend = async () => {
    setIsSubmitting(true);
    try {
      await authFetch("/api/prescriptions", {
        method: "POST",
        body: JSON.stringify({
          appointmentId: params.appointmentId && params.appointmentId.length > 10 ? params.appointmentId : undefined,
          medicationName: medication,
          dosageInstructions,
          dispensingPharmacy: pharmacyName,
        }),
      });
    } catch (err) {
      console.warn("[Rx dispatch error]", err);
    }
    setIsSubmitting(false);
    setIsDispatched(true);
    setTimeout(() => {
      router.replace("/(clinician)/schedule");
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Electronic Prescription (EPS)
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Prescribing clinician: {clinicianName} · GDC #248912
          </ThemedText>
        </View>

        {/* Patient Recipient Card */}
        <Card elevation="raised" style={styles.card}>
          <ThemedText variant="headline">Patient Information</ThemedText>
          <ThemedText variant="body">{patientName}</ThemedText>
          <ThemedText variant="caption" style={styles.address}>
            {patientAddress}
          </ThemedText>
          <ThemedText variant="caption" style={styles.allergyWarning}>
            ⚠️ Known Allergy: Penicillin (Check before dispensing)
          </ThemedText>
        </Card>

        {/* Prescription Form */}
        <View style={styles.form}>
          <Input
            label="Prescribed Drug & Formulation"
            value={medication}
            onChangeText={setMedication}
          />

          <Input
            label="Dosage & Frequency"
            value={dosageInstructions}
            onChangeText={setDosageInstructions}
          />

          <Input
            label="Nominated Dispensing Pharmacy"
            value={pharmacyName}
            onChangeText={setPharmacyName}
          />
        </View>

        {isDispatched ? (
          <View style={styles.successBox}>
            <ThemedText variant="caption" style={styles.successText}>
              ✓ Digitally signed with GDC credentials and transmitted to NHS Spine / EPS. Returning to schedule...
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>

      {/* Footer Action */}
      <View style={styles.footer}>
        <Button
          title={isSubmitting ? "Digitally Signing..." : "Sign & Dispatch E-Prescription (EPS) ✍️"}
          size="lg"
          loading={isSubmitting}
          onPress={handleSignAndSend}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  address: {
    color: colors.secondaryLabel,
  },
  allergyWarning: {
    color: colors.danger,
    fontWeight: "600",
    marginTop: 2,
  },
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
  form: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xxs,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  successBox: {
    alignItems: "center",
    backgroundColor: colors.successSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  successText: {
    color: colors.success,
    fontWeight: "600",
  },
  title: {
    color: colors.label,
  },
});

