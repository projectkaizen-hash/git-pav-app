import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ThemedText,
  Card,
  Badge,
  Button,
  AppIcon,
  ChipPill,
  ConfirmSheet,
  Toast,
  EmptyState,
} from "@/components";
import { colors, spacing } from "@/theme";
import { useMyAppointments, useCancelAppointmentMutation } from "@/features/hooks/use-dental-api";

// ─── Appointment detail — full context + lifecycle actions ────────────────────
// Reference pattern: Mobbin Zocdoc appointment detail (map, reschedule, cancel)
// plus MyChart pre-visit check-in entry and post-visit rating.

interface Booking {
  id: string;
  status: string;
  channel: string;
  startTimeUtc: string;
  service?: { name?: string; pricePence?: number; depositPence?: number };
  clinician?: { fullName?: string };
  clinic?: { name?: string; addressLine1?: string };
  van?: { name?: string };
}

function Row({ icon, label, value }: { icon: "calendar" | "clock" | "mapPin" | "profile" | "creditCard"; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppIcon name={icon} size={15} color={colors.secondaryLabel} />
      <ThemedText variant="caption" style={styles.detailLabel}>
        {label}
      </ThemedText>
      <ThemedText variant="subhead" style={styles.detailValue} numberOfLines={2}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function AppointmentDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: apiAppointments, isLoading } = useMyAppointments();
  const cancelMutation = useCancelAppointmentMutation();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [myRating, setMyRating] = useState(0);

  const source: Booking[] = (apiAppointments ?? []) as Booking[];
  const booking = source.find((b) => b.id === id);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={{ padding: spacing.md, minHeight: 180, backgroundColor: colors.secondaryBackground, borderRadius: 16 }} />
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <EmptyState
          heading="Appointment not found"
          body="This booking may have been removed or belongs to another account."
          actionLabel="Back to bookings"
          onAction={() => router.back()}
          icon="calendar"
        />
      </View>
    );
  }

  const start = new Date(booking.startTimeUtc);
  const dateLine = start.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeLine = start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const locationName = booking.clinic?.name || booking.van?.name || "Video Consultation";
  const clinicianName = booking.clinician?.fullName || "Assigned Practitioner";

  const isPast = start.getTime() < Date.now();
  const isCancelled = booking.status === "cancelled";
  const within24h = !isPast && start.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  const doCancel = () => {
    setConfirmCancel(false);
    cancelMutation.mutate(booking.id, {
      onSuccess: (result) => {
        setToast({ message: "Appointment cancelled", tone: "success" });
        router.replace({
          pathname: "/(patient)/appointments/cancelled" as never,
          params: {
            appointmentId: booking.id,
            refundAmountPence: String(result.refundAmountPence ?? 0),
            policyNotice: result.policyNotice ?? "",
          },
        });
      },
      onError: (err: Error) =>
        setToast({ message: err.message || "Could not cancel the appointment", tone: "error" }),
    });
  };

  return (
    <View style={styles.container}>
      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status hero */}
        <Card elevation="raised" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <ThemedText variant="headline" style={styles.serviceTitle}>
              {booking.service?.name || "Dental Treatment"}
            </ThemedText>
            <Badge
              label={isCancelled ? "Cancelled" : isPast ? "Completed" : booking.status.toUpperCase()}
              variant={isCancelled ? "danger" : isPast ? "default" : "success"}
            />
          </View>
          <ChipPill label={`${booking.channel.toUpperCase()} · ${timeLine}`} tone={isPast || isCancelled ? "neutral" : "info"} />
        </Card>

        {/* Details */}
        <Card elevation="raised" style={styles.card}>
          <Row icon="calendar" label="Date" value={dateLine} />
          <Row icon="clock" label="Time" value={timeLine} />
          <Row icon="profile" label="Clinician" value={clinicianName} />
          <Row icon="mapPin" label="Location" value={booking.clinic?.addressLine1 ? `${locationName}, ${booking.clinic.addressLine1}` : locationName} />
          <Row
            icon="creditCard"
            label="Deposit paid"
            value={booking.service?.depositPence ? `£${(booking.service.depositPence / 100).toFixed(2)}` : "—"}
          />
        </Card>

        {/* Pre-visit check-in (Mobbin checklist entry) */}
        {within24h ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start digital check-in"
            onPress={() =>
              router.push({ pathname: "/(patient)/check-in" as never, params: { appointmentId: booking.id } })
            }
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <Card elevation="raised" style={styles.checkInCard}>
              <View style={styles.checkInIcon}>
                <AppIcon name="clipboard" size={20} color={colors.onInk} />
              </View>
              <View style={styles.checkInInfo}>
                <ThemedText variant="headline" style={styles.checkInTitle}>
                  You're nearly there
                </ThemedText>
                <ThemedText variant="caption" style={styles.muted}>
                  Check in before your visit — forms, consent and balance, 5 minutes.
                </ThemedText>
              </View>
              <AppIcon name="chevronRight" size={16} color={colors.onInk} />
            </Card>
          </Pressable>
        ) : null}

        {/* Post-visit rating (Zocdoc pattern) */}
        {isPast && !isCancelled ? (
          <Card elevation="raised" style={styles.card}>
            <ThemedText variant="overline">How was your visit?</ThemedText>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${n} out of 5`}
                  accessibilityState={{ selected: myRating >= n }}
                  onPress={() => {
                    setMyRating(n);
                    setToast({ message: "Thanks — feedback saved", tone: "success" });
                  }}
                  style={{ padding: 4 }}
                >
                  <AppIcon name="star" size={26} color={n <= myRating ? colors.ink : colors.separator} />
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}
      </ScrollView>

      {/* Lifecycle actions */}
      <View style={[styles.footerBar, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
        {isCancelled ? (
          <Button
            title="Book this again"
            size="lg"
            onPress={() => router.push("/(patient)/booking/service-catalog" as never)}
          />
        ) : isPast ? (
          <Button
            title="Rebook treatment"
            size="lg"
            onPress={() => router.push("/(patient)/booking/service-catalog" as never)}
          />
        ) : (
          <>
            <Button
              title="Reschedule"
              variant="secondary"
              size="lg"
              style={styles.footerBtn}
              onPress={() =>
                router.push({ pathname: "/(patient)/booking/slot-picker" as never, params: { rescheduleOf: booking.id } })
              }
            />
            <Button
              title="Cancel appointment"
              variant="ghost"
              size="lg"
              style={styles.footerBtn}
              onPress={() => setConfirmCancel(true)}
            />
          </>
        )}
      </View>

      {confirmCancel ? (
        <ConfirmSheet
          title="Cancel this appointment?"
          message="Your slot will be released immediately. Cancelling 48 hours or more ahead refunds your deposit in full, 24 to 48 hours ahead refunds half, and under 24 hours the deposit is kept."
          confirmLabel="Cancel Appointment"
          cancelLabel="Keep Booking"
          variant="destructive"
          onConfirm={doCancel}
          onCancel={() => setConfirmCancel(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  checkInCard: {
    alignItems: "center",
    backgroundColor: colors.ink,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  checkInIcon: {
    alignItems: "center",
    backgroundColor: colors.inkSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  checkInInfo: {
    flex: 1,
    gap: 2,
  },
  checkInTitle: {
    color: colors.onInk,
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
    width: 84,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 3,
  },
  detailValue: {
    color: colors.label,
    flex: 1,
    textAlign: "right",
  },
  footerBar: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  footerBtn: {
    flex: 1,
  },
  heroCard: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  muted: {
    color: colors.alwaysWhite,
    opacity: 0.75,
  },
  ratingRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  serviceTitle: {
    color: colors.label,
    flex: 1,
  },
});
