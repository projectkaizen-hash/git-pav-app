import React from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card } from "@/components";
import { colors, spacing } from "@/theme";
import { useClinics } from "@/features/hooks/use-dental-api";
import { useBookingStore } from "@/features/booking/booking-store";
import { ClinicLocation } from "@/features/booking/booking-types";

export default function ClinicPickerScreen() {
  const router = useRouter();
  const { setClinic, service } = useBookingStore();
  const { data: clinics, isLoading, isError } = useClinics();

  const handleSelectClinic = (clinic: ClinicLocation) => {
    setClinic(clinic);
    router.push("/(patient)/booking/clinician-picker" as any);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <ThemedText variant="headline">
          {service ? `Where would you like your ${service.name}?` : "Select a Clinic"}
        </ThemedText>
        <ThemedText variant="caption" style={styles.sub}>
          All clinics are fully CQC-registered with modern sterilization suites.
        </ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.brand} />
          <ThemedText variant="caption">Loading practice locations...</ThemedText>
        </View>
      ) : isError || !clinics || clinics.length === 0 ? (
        <Card style={styles.emptyCard}>
          <ThemedText variant="headline">No Clinic Locations Available</ThemedText>
          <ThemedText variant="caption" style={styles.sub}>
            Unable to fetch clinic locations.
          </ThemedText>
        </Card>
      ) : (
        <View style={styles.clinicList}>
          {clinics.map((clinic) => (
            <Pressable
              key={clinic.id}
              onPress={() => handleSelectClinic(clinic)}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <Card elevation="raised" style={styles.card}>
                <View style={styles.iconBox}>
                  <ThemedText variant="title">🏥</ThemedText>
                </View>
                <View style={styles.info}>
                  <ThemedText variant="headline" style={styles.name}>
                    {clinic.name}
                  </ThemedText>
                  <ThemedText variant="subhead" style={styles.address}>
                    {clinic.address}, {clinic.postcode}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.hours}>
                    🕒 {clinic.operatingHours}
                  </ThemedText>
                </View>
                <ThemedText variant="headline" style={styles.arrow}>
                  ›
                </ThemedText>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  address: {
    color: colors.secondaryLabel,
  },
  arrow: {
    color: colors.tertiaryLabel,
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  clinicList: {
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
  emptyCard: {
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.lg,
  },
  header: {
    gap: spacing.xxs,
  },
  hours: {
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  loadingBox: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  name: {
    color: colors.label,
  },
  sub: {
    color: colors.secondaryLabel,
  },
});
