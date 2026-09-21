import React from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { ThemedText, Card, Button, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { createVanRequest } from "@/features/van/van-api";
import { useVanStore } from "@/features/van/van-store";

export default function VanConfirmScreen() {
  const router = useRouter();
  const store = useVanStore();

  const accessPayload = store.getAccessDetailsPayload();
  const etaLabel = store.availability?.etaLabel || "~20–30 min";

  const requestMutation = useMutation({
    mutationFn: () =>
      createVanRequest({
        serviceId: store.serviceId || "srv_checkup",
        accessDetails: accessPayload,
      }),
    onSuccess: (request) => {
      store.setActiveRequestId(request.id);
      router.replace({
        pathname: "/(patient)/van/live-track" as any,
        params: { requestId: request.id },
      });
    },
    onError: (err: any) => {
      Alert.alert(
        "Request Failed",
        err.message || "Could not dispatch van. Check that a van is online in your area."
      );
    },
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
            ⚡ Live Dispatch · Operator Accepts Within 4 Minutes
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
              🦷 {store.serviceName || "Routine Dental Examination"} ({store.serviceDurationMinutes || 45} min clinical block)
            </ThemedText>
          </View>

          <View style={styles.item}>
            <ThemedText variant="caption" style={styles.label}>
              Vehicle & Unit:
            </ThemedText>
            <ThemedText variant="caption" style={styles.subVal}>
              🚐 Mercedes Sprinter Mobile Surgical Suite (Low-dose X-Ray on board)
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
              £25.00
            </ThemedText>
          </View>

          <View style={styles.policyBox}>
            <ThemedText variant="caption" style={styles.policyNote}>
              ✓ No charge right now. You will be prompted to confirm your deposit only after the mobile clinical team accepts your request.
            </ThemedText>
            <ThemedText variant="caption" style={styles.policyNote}>
              ✓ If the request times out or is declined, you pay nothing.
            </ThemedText>
          </View>
        </Card>
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        <Button
          title={requestMutation.isPending ? "Dispatching..." : "Confirm & Request Van Visit ›"}
          size="lg"
          loading={requestMutation.isPending}
          onPress={() => requestMutation.mutate()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandVal: {
    color: colors.brand,
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
    color: colors.brand,
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
    backgroundColor: colors.brandSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  holdText: {
    color: colors.brand,
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
