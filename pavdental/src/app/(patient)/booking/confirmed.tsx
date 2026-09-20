import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { useBookingStore } from "@/features/booking/booking-store";

export default function BookingConfirmedScreen() {
  const router = useRouter();
  const { service, clinic, slot, resetDraft } = useBookingStore();

  const handleFinish = () => {
    resetDraft();
    router.replace("/(patient)/(tabs)/appointments");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <View style={styles.checkCircle}>
            <ThemedText variant="largeTitle">✅</ThemedText>
          </View>

          <ThemedText variant="largeTitle" style={styles.title}>
            Payment confirmation pending
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Your booking is held while payment is verified. We’ll show the appointment as confirmed only after secure payment processing completes.
          </ThemedText>

          <Card elevation="raised" style={styles.summaryCard}>
            <ThemedText variant="headline" style={styles.treatmentName}>
              {service?.name || "Dental Checkup"}
            </ThemedText>
            <ThemedText variant="body" style={styles.timing}>
              📅 {slot ? `${slot.dateFormatted} at ${slot.displayTime}` : "Monday 22 Sep"}
            </ThemedText>
            <ThemedText variant="caption" style={styles.location}>
              📍 {clinic?.name || "Pav Dental Central Practice"}
            </ThemedText>
          </Card>
        </View>

        <View style={styles.actions}>
          <Button
            title="View My Appointments"
            size="lg"
            onPress={handleFinish}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  centerBox: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
  },
  checkCircle: {
    alignItems: "center",
    backgroundColor: colors.successSubtle,
    borderRadius: 45,
    height: 90,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 90,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  location: {
    color: colors.secondaryLabel,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
  summaryCard: {
    backgroundColor: colors.secondaryBackground,
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.md,
    width: "100%",
  },
  timing: {
    color: colors.brand,
    fontWeight: "600",
  },
  title: {
    color: colors.label,
    textAlign: "center",
  },
  treatmentName: {
    color: colors.label,
  },
});
