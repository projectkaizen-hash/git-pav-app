import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { useStripe } from "@stripe/stripe-react-native";
import { ThemedText, Card, Button, Badge, AppIcon } from "@/components";
import { colors, spacing } from "@/theme";
import {
  createVanRequest,
  cancelVanRequest,
  retryDepositAuthorization,
  presentVanDepositSheet,
  DepositCanceledError,
} from "@/features/van/van-api";
import { useVanStore } from "@/features/van/van-store";

export default function VanConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const store = useVanStore();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accessPayload = store.getAccessDetailsPayload();
  const etaLabel = store.availability?.etaLabel || "~20–30 min";

  /**
   * Create the request, then — when the backend is in real-Stripe mode —
   * present PaymentSheet so the patient authorizes the manual-capture
   * deposit hold. The deposit is captured server-side only if an operator
   * accepts; if the request is declined or times out the backend releases
   * the hold automatically.
   */
  const submitRequest = async () => {
    setIsSubmitting(true);
    let requestId: string | null = null;
    try {
      const request = await createVanRequest({
        serviceId: store.serviceId || "srv_checkup",
        accessDetails: accessPayload,
      });
      requestId = request.id;

      if (request.isMockPayment || !request.clientSecret) {
        // Mock-Stripe backend (or no deposit configured) — straight to tracking.
        store.setActiveRequestId(request.id);
        router.replace({
          pathname: "/(patient)/van/live-track" as any,
          params: { requestId: request.id },
        });
        return;
      }

      await presentVanDepositSheet(request.clientSecret, {
        initPaymentSheet,
        presentPaymentSheet,
      }, request);

      // Authorized. The webhook stamps the request server-side.
      store.setActiveRequestId(request.id);
      router.replace({
        pathname: "/(patient)/van/live-track" as any,
        params: { requestId: request.id },
      });
    } catch (err: any) {
      if (err instanceof DepositCanceledError) {
        // Patient dismissed the sheet — offer retry or release the hold.
        Alert.alert(
          "Deposit Not Authorized",
          "Your request is on hold, but the deposit hasn't been authorized yet. The van team can only dispatch once it is.",
          [
            {
              text: "Cancel Request",
              style: "destructive",
              onPress: () => {
                if (requestId) {
                  cancelVanRequest(requestId)
                    .then(() => store.resetDraft())
                    .catch(() => {});
                }
              },
            },
            { text: "Try Again", onPress: () => submitRequestRetry(requestId) },
          ]
        );
        return;
      }

      Alert.alert(
        "Request Failed",
        err?.message || "Could not dispatch van. Check that a van is online in your area."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Retry just the PaymentSheet step after a dismissal (request already created). */
  const submitRequestRetry = async (requestId: string | null) => {
    if (!requestId) return;
    setIsSubmitting(true);
    try {
      // Re-fetch the intent secret server-side rather than reusing the stale one.
      const retry = await retryDepositAuthorization(requestId);
      if (retry.alreadyAuthorized || !retry.clientSecret) {
        store.setActiveRequestId(requestId);
        router.replace({
          pathname: "/(patient)/van/live-track" as any,
          params: { requestId },
        });
        return;
      }
      await presentVanDepositSheet(retry.clientSecret, {
        initPaymentSheet,
        presentPaymentSheet,
      }, retry);
      store.setActiveRequestId(requestId);
      router.replace({
        pathname: "/(patient)/van/live-track" as any,
        params: { requestId },
      });
    } catch {
      // Still not authorized — the live-track banner offers another retry.
      store.setActiveRequestId(requestId);
      router.replace({
        pathname: "/(patient)/van/live-track" as any,
        params: { requestId },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestMutation = useMutation({
    mutationFn: () => submitRequest(),
  });
  const fullAddress = [
    accessPayload.addressLine1,
    accessPayload.addressLine2,
    accessPayload.city,
    accessPayload.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const parkingLabelMap: Record<string, string> = {
    private_driveway: "🏠 Private Driveway",
    permit_bay: "🛣 Kerbside Permit Bay",
    visitor: "🏢 Corporate / Visitor Parking",
    other: "🅿️ Safe Loading / Kerb Area",
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner */}
        <View style={styles.holdBanner}>
          <ThemedText variant="caption" style={styles.holdText}>
            Live dispatch · operator accepts within 4 minutes
          </ThemedText>
        </View>

        {/* Visit Breakdown */}
        <Card elevation="raised" style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <ThemedText variant="headline" style={styles.title}>
              Mobile Van Visit Summary
            </ThemedText>
            <Badge label="Live Dispatch" variant="info" />
          </View>

          <View style={styles.item}>
            <ThemedText variant="caption" style={styles.label}>
              Destination:
            </ThemedText>
            <ThemedText variant="headline" style={styles.val}>
              {fullAddress}
            </ThemedText>
            <ThemedText variant="caption" style={styles.subVal}>
              Parking: {parkingLabelMap[accessPayload.parkingType] || "Private Driveway"}
              {accessPayload.gateCode ? ` · Gate: ${accessPayload.gateCode}` : ""}
            </ThemedText>
          </View>

          <View style={styles.item}>
            <ThemedText variant="caption" style={styles.label}>
              Estimated Arrival Window:
            </ThemedText>
            <ThemedText variant="headline" style={styles.brandVal}>
              {etaLabel} from operator accept
            </ThemedText>
          </View>

          <View style={styles.item}>
            <ThemedText variant="caption" style={styles.label}>
              Clinical Procedure:
            </ThemedText>
            <ThemedText variant="body" style={styles.val}>
              {store.serviceName || "Routine Dental Examination"} ({store.serviceDurationMinutes || 45} min clinical block)
            </ThemedText>
          </View>

          <View style={styles.item}>
            <ThemedText variant="caption" style={styles.label}>
              Vehicle & Unit:
            </ThemedText>
            <ThemedText variant="caption" style={styles.subVal}>
              Mercedes Sprinter Mobile Surgical Suite (Low-dose X-Ray on board)
            </ThemedText>
          </View>
        </Card>

        {/* Financials & Transparent Policy */}
        <Card elevation="raised" style={styles.card}>
          <ThemedText variant="headline" style={styles.title}>
            Pricing & Payment Terms
          </ThemedText>

          <View style={styles.rowBetween}>
            <ThemedText variant="body" style={styles.label}>
              Clinical Treatment & Call-Out:
            </ThemedText>
            <ThemedText variant="mono">
              £{((store.servicePricePence || 8500) / 100).toFixed(2)}
            </ThemedText>
          </View>

          <View style={styles.rowBetween}>
            <ThemedText variant="headline">Deposit Due on Accept:</ThemedText>
            <ThemedText variant="title" style={styles.depositPrice}>
              £{(((store.serviceDepositPence ?? 0) || 2500) / 100).toFixed(2)}
            </ThemedText>
          </View>

          <View style={styles.policyBox}>
            <ThemedText variant="caption" style={styles.policyNote}>
              No charge right now. You will be prompted to confirm your deposit only after the mobile clinical team accepts your request.
            </ThemedText>
            <ThemedText variant="caption" style={styles.policyNote}>
              If the request times out or is declined, you pay nothing.
            </ThemedText>
          </View>
        </Card>
      </ScrollView>

      {/* Action Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
        <Button
          title={isSubmitting ? "Dispatching..." : "Confirm & Request Van Visit ›"}
          size="lg"
          loading={isSubmitting}
          onPress={() => requestMutation.mutate()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandVal: {
    color: colors.ink,
    fontWeight: "700",
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  depositPrice: {
    color: colors.ink,
    fontWeight: "700",
  },
  footer: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  holdBanner: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  holdText: {
    color: colors.ink,
    fontWeight: "600",
  },
  item: {
    gap: 2,
  },
  label: {
    color: colors.secondaryLabel,
  },
  policyBox: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    gap: 4,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  policyNote: {
    color: colors.secondaryLabel,
    lineHeight: 16,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  subVal: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
  val: {
    color: colors.label,
  },
});
