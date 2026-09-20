import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button } from "@/components";
import { colors, spacing } from "@/theme";

export default function VanConfirmScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleConfirmAndPay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace("/(patient)/van/live-track" as any);
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.holdBanner}>
          <ThemedText variant="caption" style={styles.holdText}>
            ⏱ 10-Minute Dispatch Hold Active
          </ThemedText>
        </View>

        {/* Van Visit Review */}
        <Card elevation="raised" style={styles.card}>
          <ThemedText variant="headline" style={styles.title}>
            Mobile Van Visit Breakdown
          </ThemedText>

          <View style={styles.item}>
            <ThemedText variant="caption" style={styles.label}>
              Destination:
            </ThemedText>
            <ThemedText variant="headline" style={styles.val}>
              10 Downing Street, SW1A 2AA
            </ThemedText>
            <ThemedText variant="caption" style={styles.subVal}>
              Private Driveway · Gate Code: #4812
            </ThemedText>
          </View>

          <View style={styles.item}>
            <ThemedText variant="caption" style={styles.label}>
              Arrival Window:
            </ThemedText>
            <ThemedText variant="headline" style={styles.brandVal}>
              Tue 23 Sep (09:30 – 11:00 AM)
            </ThemedText>
          </View>

          <View style={styles.item}>
            <ThemedText variant="caption" style={styles.label}>
              Assigned Vehicle:
            </ThemedText>
            <ThemedText variant="body" style={styles.val}>
              🚐 Pav Dental Van #1 (Mercedes Sprinter)
            </ThemedText>
          </View>
        </Card>

        {/* Financials */}
        <Card elevation="raised" style={styles.card}>
          <ThemedText variant="headline" style={styles.title}>
            Deposit & Payment
          </ThemedText>

          <View style={styles.rowBetween}>
            <ThemedText variant="body" style={styles.label}>
              Clinical Call-Out & Treatment Fee:
            </ThemedText>
            <ThemedText variant="mono">£85.00</ThemedText>
          </View>

          <View style={styles.rowBetween}>
            <ThemedText variant="headline">
              Deposit Due Today (Stripe):
            </ThemedText>
            <ThemedText variant="mono" style={styles.depositVal}>
              £25.00
            </ThemedText>
          </View>

          <ThemedText variant="caption" style={styles.policyNote}>
            🛡 Free cancellation up to 24h prior. Live vehicle GPS tracking becomes active on your appointment morning.
          </ThemedText>
        </Card>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={loading ? "Securing Van Dispatch..." : "Pay £25.00 Deposit & Confirm"}
          size="lg"
          loading={loading}
          onPress={handleConfirmAndPay}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandVal: {
    color: colors.brand,
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
  depositVal: {
    color: colors.brand,
    fontSize: 18,
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
    backgroundColor: colors.warningSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  holdText: {
    color: colors.warning,
    fontWeight: "700",
  },
  item: {
    gap: 2,
  },
  label: {
    color: colors.secondaryLabel,
  },
  policyNote: {
    color: colors.secondaryLabel,
    lineHeight: 16,
    marginTop: spacing.xxs,
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

