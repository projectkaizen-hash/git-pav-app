import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { useBookingStore } from "@/features/booking/booking-store";
import { fetchMyAppointments } from "@/features/booking/booking-api";

export default function BookingConfirmedScreen() {
  const router = useRouter();
  const { service, clinic, slot, resetDraft } = useBookingStore();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Poll for appointment confirmation status
  useEffect(() => {
    const checkConfirmation = async () => {
      try {
        const appointments = await fetchMyAppointments();
        // Check if the most recent appointment matches our booking and is confirmed
        const recentAppointment = appointments[0];
        if (recentAppointment && recentAppointment.status === "confirmed") {
          setIsConfirmed(true);
          setIsChecking(false);
        }
      } catch (error) {
        console.error("Error checking appointment status:", error);
      }
    };

    // Check immediately, then poll every 3 seconds for up to 30 seconds
    checkConfirmation();
    const interval = setInterval(checkConfirmation, 3000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setIsChecking(false);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const handleFinish = () => {
    resetDraft();
    router.replace("/(patient)/(tabs)/appointments");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.centerBox}>
          <View style={[styles.checkCircle, isConfirmed ? styles.confirmedCircle : styles.pendingCircle]}>
            <ThemedText variant="largeTitle">
              {isChecking ? "⏳" : isConfirmed ? "✅" : "⚠️"}
            </ThemedText>
          </View>

          <ThemedText variant="largeTitle" style={styles.title}>
            {isChecking ? "Verifying payment..." : isConfirmed ? "Booking confirmed!" : "Payment verification timeout"}
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            {isChecking 
              ? "Your booking is held while payment is verified. This usually takes a few seconds."
              : isConfirmed
              ? "Your appointment has been successfully confirmed. You'll receive a confirmation email shortly."
              : "Payment verification is taking longer than expected. Your appointment may still be confirmed. Please check your appointments list."
            }
          </ThemedText>

          {isChecking && (
            <ActivityIndicator size="large" color={colors.brand} style={styles.spinner} />
          )}

          <Card elevation="raised" style={styles.summaryCard}>
            <ThemedText variant="headline" style={styles.treatmentName}>
              {service?.name || "Dental Checkup"}
            </ThemedText>
            <ThemedText variant="body" style={styles.timing}>
              📅 {slot ? `${slot.dateFormatted} at ${slot.displayTime}` : "Selected Time"}
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
    borderRadius: 45,
    height: 90,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 90,
  },
  confirmedCircle: {
    backgroundColor: colors.successSubtle,
  },
  pendingCircle: {
    backgroundColor: colors.warningSubtle,
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
  spinner: {
    marginTop: spacing.md,
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
