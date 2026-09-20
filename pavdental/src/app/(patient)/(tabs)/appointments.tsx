import React from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Badge, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { useMyAppointments, useCancelAppointmentMutation } from "@/features/hooks/use-dental-api";

export default function PatientAppointmentsScreen() {
  const router = useRouter();
  const { data: appointments, isLoading, isError, refetch } = useMyAppointments();
  const cancelMutation = useCancelAppointmentMutation();

  const handleCancel = (appointmentId: string) => {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        { text: "Keep Booking", style: "cancel" },
        {
          text: "Cancel Appointment",
          style: "destructive",
          onPress: () => {
            cancelMutation.mutate(appointmentId, {
              onSuccess: () => {
                Alert.alert("Cancelled", "Your appointment has been cancelled.");
              },
              onError: (err: any) => {
                Alert.alert("Error", err.message || "Failed to cancel appointment");
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.sectionHeader}>
          <ThemedText variant="headline">Upcoming Appointments</ThemedText>
          <ThemedText variant="caption" style={styles.sub}>
            Live appointments from Pav Dental Practice Gateway.
          </ThemedText>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.brand} />
            <ThemedText variant="caption" style={styles.loadingText}>
              Loading your appointments...
            </ThemedText>
          </View>
        ) : isError ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="headline" style={{ color: colors.danger }}>
              Unable to load appointments
            </ThemedText>
            <ThemedText variant="caption" style={styles.emptySub}>
              Check your network connection and try again.
            </ThemedText>
            <Button title="Retry" variant="secondary" size="sm" onPress={() => refetch()} />
          </Card>
        ) : !appointments || appointments.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="headline">No Active Appointments</ThemedText>
            <ThemedText variant="caption" style={styles.emptySub}>
              You don't have any upcoming dental consultations scheduled.
            </ThemedText>
          </Card>
        ) : (
          appointments.map((b: any) => {
            const formattedDate = new Date(b.startTimeUtc).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            });
            const locationName = b.clinic?.name || b.van?.name || "Video Consultation";
            const clinicianName = b.clinician?.fullName || "Assigned Practitioner";

            return (
              <Card key={b.id} elevation="raised" style={styles.bookingCard}>
                <View style={styles.cardTop}>
                  <Badge
                    label={String(b.status).toUpperCase()}
                    variant={b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : "default"}
                  />
                  <ThemedText variant="caption" style={styles.channelLabel}>
                    {String(b.channel).toUpperCase()}
                  </ThemedText>
                </View>

                <ThemedText variant="headline" style={styles.serviceTitle}>
                  {b.service?.name || "Dental Treatment"}
                </ThemedText>

                <ThemedText variant="body" style={styles.timeHighlight}>
                  📅 {formattedDate}
                </ThemedText>

                <View style={styles.footerDetails}>
                  <ThemedText variant="caption" style={styles.detailText}>
                    👨‍⚕️ {clinicianName}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.detailText}>
                    📍 {locationName}
                  </ThemedText>
                </View>

                {b.status !== "cancelled" && (
                  <View style={styles.actionRow}>
                    <Button
                      title="Cancel Booking"
                      variant="destructive"
                      size="sm"
                      onPress={() => handleCancel(b.id)}
                    />
                  </View>
                )}
              </Card>
            );
          })
        )}

        <View style={styles.newBookingSection}>
          <Button
            title="+ Book Another Appointment"
            size="lg"
            onPress={() => router.push("/(patient)/booking/service-catalog" as any)}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  bookingCard: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  channelLabel: {
    color: colors.secondaryLabel,
    fontWeight: "600",
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  detailText: {
    color: colors.secondaryLabel,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  emptySub: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  footerDetails: {
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 2,
    marginTop: spacing.xxs,
    paddingTop: spacing.xs,
  },
  list: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingBox: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.secondaryLabel,
  },
  newBookingSection: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    gap: 2,
    marginBottom: spacing.xs,
  },
  serviceTitle: {
    color: colors.label,
    marginTop: 2,
  },
  sub: {
    color: colors.secondaryLabel,
  },
  timeHighlight: {
    color: colors.brand,
    fontWeight: "600",
  },
});
