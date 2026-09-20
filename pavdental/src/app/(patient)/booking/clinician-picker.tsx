import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { useBookingStore } from "@/features/booking/booking-store";
import { Clinician } from "@/features/booking/booking-types";

import { useClinicians } from "@/features/hooks/use-dental-api";

export default function ClinicianPickerScreen() {
  const router = useRouter();
  const { setClinician, clinic } = useBookingStore();

  const { data: apiClinicians } = useClinicians();
  const clinicians = (apiClinicians || []) as Clinician[];

  const handleSelectClinician = (clinician: Clinician | null) => {
    setClinician(clinician);
    router.push("/(patient)/booking/slot-picker" as any);
  };

  const eligibleClinicians = clinicians.filter((doc) => {
    if (!clinic) return true;
    return doc.clinicIds ? doc.clinicIds.includes(clinic.id) : true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText variant="headline">Select a Dentist or Hygienist</ThemedText>
        <ThemedText variant="caption" style={styles.sub}>
          Or choose 'First Available' for the earliest appointment slot.
        </ThemedText>
      </View>

      {/* First Available Option */}
      <Pressable
        onPress={() => handleSelectClinician(null)}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
      >
        <Card elevation="raised" style={styles.anyCard}>
          <View style={styles.anyIcon}>
            <ThemedText variant="title">⚡️</ThemedText>
          </View>
          <View style={styles.anyInfo}>
            <ThemedText variant="headline" style={styles.anyTitle}>
              Any Practitioner (First Available)
            </ThemedText>
            <ThemedText variant="caption" style={styles.anySub}>
              Recommended for urgent care or fastest booking dates.
            </ThemedText>
          </View>
          <ThemedText variant="headline" style={styles.arrow}>
            ›
          </ThemedText>
        </Card>
      </Pressable>

      {/* Clinicians List */}
      <View style={styles.clinicianList}>
        {eligibleClinicians.map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => handleSelectClinician(doc)}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <Card elevation="raised" style={styles.card}>
              <View style={styles.docRow}>
                <View style={styles.avatar}>
                  <ThemedText variant="title" style={styles.avatarText}>
                    {doc.fullName[3] || "D"}
                  </ThemedText>
                </View>
                <View style={styles.docInfo}>
                  <ThemedText variant="headline" style={styles.name}>
                    {doc.fullName}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.role}>
                    {doc.roleTitle} · GDC: #{doc.gdcNumber}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.bio} numberOfLines={2}>
                    {doc.bio}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.specialismsRow}>
                {doc.specialisms.map((spec) => (
                  <Badge key={spec} label={spec} variant="default" />
                ))}
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  anyCard: {
    alignItems: "center",
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  anyIcon: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  anyInfo: {
    flex: 1,
    gap: 2,
  },
  anySub: {
    color: colors.secondaryLabel,
  },
  anyTitle: {
    color: colors.brand,
  },
  arrow: {
    color: colors.brand,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  avatarText: {
    color: colors.brand,
    fontWeight: "700",
  },
  bio: {
    color: colors.secondaryLabel,
    lineHeight: 16,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
    padding: spacing.md,
  },
  clinicianList: {
    gap: spacing.md,
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
  },
  docInfo: {
    flex: 1,
    gap: 2,
  },
  docRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
  },
  header: {
    gap: spacing.xxs,
  },
  name: {
    color: colors.label,
  },
  role: {
    color: colors.secondaryLabel,
    fontWeight: "500",
  },
  specialismsRow: {
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: spacing.xs,
  },
  sub: {
    color: colors.secondaryLabel,
  },
});

