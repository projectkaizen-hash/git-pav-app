import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStripe } from "@stripe/stripe-react-native";
import { ThemedText, Card, Button, AppIcon, ProgressPills } from "@/components";
import { colors, spacing } from "@/theme";
import { useBookingStore } from "@/features/booking/booking-store";
import { formatGbp, createAppointment, createPaymentIntent } from "@/features/booking/booking-api";
import { useRewards } from "@/features/hooks/use-dental-api";
import { useDependants } from "@/features/account/account-hooks";

export default function BookingSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { service, clinic, clinician, slot, holdExpiresAt, resetDraft } = useBookingStore();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
  const [isProcessing, setIsProcessing] = useState(false);
  // A rewards voucher off this deposit (decisions log #14). The server checks
  // it and sets the amount; this only previews it.
  const { data: rewardsData } = useRewards();
  const voucher: { voucherCode: string; discountPence: number } | undefined = rewardsData?.vouchers?.[0];
  const [useVoucher, setUseVoucher] = useState(false);
  // A parent or guardian can book for their child (decisions log #17).
  const { data: dependants = [] } = useDependants();
  const [dependantId, setDependantId] = useState<string | null>(null);
  const depositPence = service?.depositPence || 2000;
  const voucherFits = !!voucher && voucher.discountPence < depositPence;
  const depositDuePence = useVoucher && voucherFits ? depositPence - voucher!.discountPence : depositPence;

  useEffect(() => {
    if (!holdExpiresAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((holdExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        // Handle expired hold
        Alert.alert(
          "Slot Reservation Expired",
          "Your slot reservation has expired. Please select a new time slot.",
          [
            { text: "OK", onPress: () => {
              resetDraft();
              router.replace("/(patient)/booking/slot-picker" as any);
            }}
          ]
        );
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
        dependantId: dependantId ?? undefined,
      });

      // 2. Create PaymentIntent on the server — amount is server-authoritative
      const intent = await createPaymentIntent(appt.id, useVoucher && voucherFits ? voucher!.voucherCode : undefined);

      // 3. Validate that we have a real payment intent
      if (!intent.clientSecret) {
        throw new Error("Payment setup failed - no client secret received");
      }

      // 4. Initialise the PaymentSheet with the client secret
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "Pav Dental",
        paymentIntentClientSecret: intent.clientSecret,
        returnURL: "pavdental://stripe-return",
        // Allow customers to pay within your app
        allowsDelayedPaymentMethods: true,
        // Appearance tweaks to match app theme
        appearance: {
          colors: {
            primary: colors.ink as string,
            background: colors.systemBackground as string,
            componentBackground: colors.secondaryBackground as string,
            componentText: colors.label as string,
            placeholderText: colors.secondaryLabel as string,
          },
        },
        // Surface Apple Pay / Google Pay inside the native sheet
        applePay: { merchantCountryCode: "GB" },
        googlePay: { merchantCountryCode: "GB", currencyCode: "GBP", testEnv: true },
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
      router.push(`/(patient)/booking/confirmed?appointmentId=${appt.id}` as any);
    } catch (err: any) {
      Alert.alert("Something went wrong", err?.message ?? "Could not process payment.");
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressPills total={5} current={5} />

        {/* Soft Hold Countdown Banner */}
        <View style={styles.timerBanner}>
          <AppIcon name="clock" size={14} color={colors.warning} />
          <ThemedText variant="caption" style={styles.timerText}>
            Slot reserved for {formatTimer(secondsRemaining)}. Complete payment to secure.
          </ThemedText>
        </View>

        {dependants.length > 0 && (
          <Card elevation="raised" style={styles.card}>
            <ThemedText variant="headline" style={styles.sectionTitle}>
              Who is this appointment for?
            </ThemedText>
            <View style={styles.whoRow}>
              {[{ id: null as string | null, label: "Me" }, ...dependants.map((d) => ({ id: d.id as string | null, label: d.firstName }))].map(
                (option) => {
                  const selected = dependantId === option.id;
                  return (
                    <Pressable
                      key={option.id ?? "me"}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setDependantId(option.id)}
                      style={[styles.whoPill, selected && styles.whoPillSelected]}
                    >
                      <ThemedText variant="caption" style={selected ? styles.whoTextSelected : styles.label}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                }
              )}
            </View>
          </Card>
        )}

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

        {/* Insurance & eligibility (optional, Mobbin Zocdoc pattern) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add or verify insurance"
          onPress={() => router.push("/(patient)/booking/insurance" as never)}
          style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        >
          <Card elevation="flat" style={styles.insuranceRow}>
            <AppIcon name="shield" size={16} color={colors.ink} />
            <ThemedText variant="caption" style={styles.insuranceText}>
              Insurance & eligibility — scan a policy to auto-claim
            </ThemedText>
            <AppIcon name="chevronRight" size={14} color={colors.tertiaryLabel} />
          </Card>
        </Pressable>

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

          {voucherFits && (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: useVoucher }}
              onPress={() => setUseVoucher((v) => !v)}
              style={styles.priceRow}
            >
              <ThemedText variant="body" style={styles.label}>
                {useVoucher ? "☑" : "☐"} Use rewards voucher ({formatGbp(voucher!.discountPence)} off)
              </ThemedText>
              {useVoucher && <ThemedText variant="mono">–{formatGbp(voucher!.discountPence)}</ThemedText>}
            </Pressable>
          )}

          <View style={styles.priceRow}>
            <ThemedText variant="headline" style={styles.depositLabel}>
              Deposit Due Today (Stripe):
            </ThemedText>
            <ThemedText variant="mono" style={styles.depositAmount}>
              {formatGbp(depositDuePence)}
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
            Cancel 48 hours or more before your visit for a full deposit refund, or 24 to 48 hours before for half. Deposits aren't refunded for cancellations less than 24 hours before. Refunds go back to your card automatically.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Wallet-first payment CTAs (Apple/Google Pay primary) */}
      <View style={[styles.footerBar, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            Platform.OS === "android" ? "Pay deposit with Google Pay" : "Pay deposit with Apple Pay"
          }
          disabled={secondsRemaining === 0 || isProcessing}
          onPress={handlePayDeposit}
          style={({ pressed }) => [
            styles.walletButton,
            (secondsRemaining === 0 || isProcessing) && styles.walletButtonDisabled,
            pressed && { opacity: 0.85 },
          ]}
        >
          <ThemedText variant="headline" style={styles.walletText}>
            {isProcessing ? "Processing…" : Platform.OS === "android" ? "Google Pay" : "Apple Pay"}
          </ThemedText>
          <ThemedText variant="headline" style={styles.walletText}>
            {formatGbp(depositDuePence)}
          </ThemedText>
        </Pressable>
        <Button
          title={secondsRemaining === 0 ? "Slot Expired - Select New Time" : `Pay by card instead`}
          size="lg"
          variant="secondary"
          loading={isProcessing}
          disabled={secondsRemaining === 0}
          onPress={secondsRemaining === 0 ? () => {
            resetDraft();
            router.replace("/(patient)/booking/slot-picker" as any);
          } : handlePayDeposit}
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
    color: colors.ink,
  },
  depositAmount: {
    color: colors.ink,
  },
  depositLabel: {
    color: colors.label,
  },
  footerBar: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  insuranceRow: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  insuranceText: {
    color: colors.label,
    flex: 1,
    fontWeight: "600",
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
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  timerText: {
    color: colors.warning,
    flex: 1,
    fontWeight: "600",
  },
  whoPill: {
    borderColor: colors.separator,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  whoPillSelected: {
    backgroundColor: colors.inkSubtle,
    borderColor: colors.ink,
  },
  whoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  whoTextSelected: {
    color: colors.ink,
    fontWeight: "600",
  },
  walletButton: {
    alignItems: "center",
    backgroundColor: colors.alwaysBlack,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  walletButtonDisabled: {
    opacity: 0.4,
  },
  walletText: {
    color: colors.alwaysWhite,
  },
  value: {
    color: colors.label,
  },
});
