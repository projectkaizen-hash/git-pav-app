import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useStripe } from "@stripe/stripe-react-native";
import { ThemedText, Card, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { useBookingStore } from "@/features/booking/booking-store";
import { formatGbp, createAppointment, createPaymentIntent } from "@/features/booking/booking-api";

export default function BookingSummaryScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { service, clinic, clinician, slot, holdExpiresAt } = useBookingStore();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!holdExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((holdExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handlePayDeposit = async () => {
    setIsProcessing(true);
    try {
      const startTime = slot?.startTimeUtc || new Date().toISOString();
      const endTime = slot?.endTimeUtc || new Date(Date.now() + 1800000).toISOString();

      // 1. Create draft appointment
      const appt = await createAppointment({
        serviceId: service?.id || "srv_checkup",
        channel: (service?.supportedChannels[0] as any) || "clinic",
        clinicianId: clinician?.id,
        clinicId: clinic?.id,
        startTimeUtc: startTime,
        endTimeUtc: endTime,
        slotId: slot?.id,
      });

      // 2. Create PaymentIntent on the server — amount is server-authoritative
      const intent = await createPaymentIntent(appt.id);

      // 3. In mock/dev mode skip the sheet — backend will confirm via mock webhook
      if (intent.isMock || !intent.clientSecret) {
        setIsProcessing(false);
        router.replace("/(patient)/booking/confirmed" as any);
        return;
      }

      // 4. Initialise the PaymentSheet with the client secret
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Pav Dental",
        paymentIntentClientSecret: intent.clientSecret,
        returnURL: "pavdental://stripe-return",
        // Appearance tweaks to match app theme
        appearance: {
          colors: {
            primary: colors.brand as string,
            background: colors.systemBackground as string,
            componentBackground: colors.secondaryBackground as string,
            componentText: colors.label as string,
            placeholderText: colors.secondaryLabel as string,
          },
        },
      });

      if (initError) {
        Alert.alert("Payment Error", initError.message);
        setIsProcessing(false);
        return;
      }

      // 5. Present — user fills card details in native sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // User cancelled or card declined — stay on summary screen
        if (presentError.code !== "Canceled") {
          Alert.alert("Payment Failed", presentError.message);
        }
        setIsProcessing(false);
        return;
      }

      // 6. Payment collected — Stripe webhook will confirm the appointment server-side
      setIsProcessing(false);
      router.replace("/(patient)/booking/confirmed" as any);
    } catch (err: any) {
      Alert.alert("Something went wrong", err?.message ?? "Could not process payment.");
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Soft Hold Countdown Banner */}
        <View style={styles.timerBanner}>
          <ThemedText variant="caption" style={styles.timerText}>
            ⏳ Slot reserved for {formatTimer(secondsRemaining)}. Complete payment to secure.
          </ThemedText>
        </View>

        {/* Appointment Breakdown Card */}
        <Card elevation="raised" style={styles.card}>
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Appointment Details
          </ThemedText>

          <View style={styles.row}>
            <ThemedText variant="subhead" style={styles.label}>
              Treatment:
            </ThemedText>
            <ThemedText variant="headline" style={styles.value}>
              {service?.name || "Dental Checkup"}
            </ThemedText>
          </View>

          <View style={styles.row}>
            <ThemedText variant="subhead" style={styles.label}>
              Practice:
            </ThemedText>
            <ThemedText variant="body" style={styles.value}>
              {clinic?.name || "Pav Dental Central Practice"}
            </ThemedText>
          </View>

          <View style={styles.row}>
            <ThemedText variant="subhead" style={styles.label}>
              Dentist:
            </ThemedText>
            <ThemedText variant="body" style={styles.value}>
              {clinician?.fullName || "First Available Practitioner"}
            </ThemedText>
          </View>

          <View style={styles.row}>
            <ThemedText variant="subhead" style={styles.label}>
              Date & Time:
            </ThemedText>
            <ThemedText variant="headline" style={styles.dateHighlight}>
              {slot ? `${slot.dateFormatted} at ${slot.displayTime}` : "Selected Slot"}
            </ThemedText>
          </View>
        </Card>

        {/* Payment & Deposit Summary */}
        <Card elevation="raised" style={styles.card}>
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Payment Breakdown
          </ThemedText>

          <View style={styles.priceRow}>
            <ThemedText variant="body" style={styles.label}>
              Total Treatment Fee:
            </ThemedText>
            <ThemedText variant="mono">
              {formatGbp(service?.pricePence || 6500)}
            </ThemedText>
          </View>

          <View style={styles.priceRow}>
            <ThemedText variant="headline" style={styles.depositLabel}>
              Deposit Due Today (Stripe):
            </ThemedText>
            <ThemedText variant="mono" style={styles.depositAmount}>
              {formatGbp(service?.depositPence || 2000)}
            </ThemedText>
          </View>

          <ThemedText variant="caption" style={styles.balanceNote}>
            The remaining balance of {formatGbp((service?.pricePence || 6500) - (service?.depositPence || 2000))} is payable after your visit.
          </ThemedText>
        </Card>

        {/* Cancellation Policy */}
        <View style={styles.policyBox}>
          <ThemedText variant="caption" style={styles.policyTitle}>
            Cancellation & Reschedule Policy:
          </ThemedText>
          <ThemedText variant="caption" style={styles.policyText}>
            You can reschedule or cancel free of charge up to 48 hours prior to your visit. Deposits are fully refunded automatically to your card for cancellations within this window.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Stripe Payment CTA */}
      <View style={styles.footerBar}>
        <Button
          title={isProcessing ? "Processing Stripe..." : `Pay ${formatGbp(service?.depositPence || 2000)} Deposit`}
          size="lg"
          loading={isProcessing}
          onPress={handlePayDeposit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceNote: {
    color: colors.secondaryLabel,
    marginTop: spacing.xxs,
  },
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
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
  dateHighlight: {
    color: colors.brand,
  },
  depositAmount: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: "700",
  },
  depositLabel: {
    color: colors.label,
  },
  footerBar: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  label: {
    color: colors.secondaryLabel,
  },
  policyBox: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    gap: 4,
    padding: spacing.md,
  },
  policyText: {
    color: colors.secondaryLabel,
    lineHeight: 16,
  },
  policyTitle: {
    color: colors.label,
    fontWeight: "700",
  },
  priceRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  row: {
    gap: 2,
    paddingVertical: 2,
  },
  sectionTitle: {
    color: colors.label,
    marginBottom: spacing.xxs,
  },
  timerBanner: {
    alignItems: "center",
    backgroundColor: colors.warningSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  timerText: {
    color: colors.warning,
    fontWeight: "700",
  },
  value: {
    color: colors.label,
  },
});
