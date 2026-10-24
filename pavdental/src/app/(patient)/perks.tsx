import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button, AppIcon, Badge, Toast } from "@/components";
import { colors, spacing, radius } from "@/theme";
import { useRewards, useRedeemRewardMutation } from "@/features/hooks/use-dental-api";
import { formatGbp } from "@/features/booking/booking-api";

// Everything here comes from the server (decisions log #14): points are
// earned only for completed visits and spent as money off a later deposit.
interface RewardItem {
  id: string;
  title: string;
  category: string;
  pointsCost: number;
  discountPence: number;
  description: string;
}

interface Voucher {
  id: string;
  voucherCode: string;
  rewardTitle: string;
  discountPence: number;
}

export default function OralHealthPerksScreen() {
  const router = useRouter();
  const { data: rewardsData, isLoading, isError } = useRewards();
  const redeemMutation = useRedeemRewardMutation();
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const pointsBalance: number = rewardsData?.pointsBalance ?? 0;
  const pointsPerVisit: number | undefined = rewardsData?.pointsPerCompletedVisit;
  const catalog: RewardItem[] = rewardsData?.catalog ?? [];
  const vouchers: Voucher[] = rewardsData?.vouchers ?? [];

  const handleRedeem = async (item: RewardItem) => {
    try {
      const res = await redeemMutation.mutateAsync({ rewardId: item.id });
      setSelectedReward(null);
      setToast({
        message: `Voucher ${res.voucherCode} added. You can use it when you pay your next deposit.`,
        tone: "success",
      });
    } catch (err: any) {
      setSelectedReward(null);
      setToast({ message: err?.message || "Could not redeem points", tone: "error" });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
          >
            <AppIcon name="chevronLeft" size={20} color={colors.ink} />
            <ThemedText variant="subhead" style={styles.backText}>Back</ThemedText>
          </Pressable>
          <ThemedText variant="largeTitle" style={styles.title}>
            Rewards
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            {pointsPerVisit
              ? `You earn ${pointsPerVisit} points for each completed visit. Use them for money off a future deposit.`
              : "Earn points for completed visits and use them for money off a future deposit."}
          </ThemedText>
        </View>

        <Card elevation="raised" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <ThemedText variant="caption" style={styles.heroLabel}>YOUR POINTS</ThemedText>
              <ThemedText variant="largeTitle" style={styles.heroPoints}>
                {isLoading ? "–" : pointsBalance.toLocaleString("en-GB")}
              </ThemedText>
              <ThemedText variant="caption" style={styles.heroSub}>
                {isError ? "Couldn't load your points. Try again later." : "Points available"}
              </ThemedText>
            </View>
          </View>
        </Card>

        {vouchers.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <ThemedText variant="headline" style={styles.sectionTitle}>
                Your vouchers
              </ThemedText>
              <ThemedText variant="caption" style={styles.muted}>
                Choose a voucher when you pay the deposit for your next booking.
              </ThemedText>
            </View>
            <Card style={styles.itemCard}>
              {vouchers.map((v, i) => (
                <View key={v.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.voucherRow}>
                    <ThemedText variant="subhead">{formatGbp(v.discountPence)} off a deposit</ThemedText>
                    <View style={styles.promoCodePill}>
                      <ThemedText variant="caption" style={styles.promoCodeText}>{v.voucherCode}</ThemedText>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        <View style={styles.sectionHeader}>
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Use your points
          </ThemedText>
        </View>

        <View style={styles.catalogGrid}>
          {catalog.map((item) => {
            const canAfford = pointsBalance >= item.pointsCost;
            return (
              <Card key={item.id} elevation="raised" style={styles.itemCard}>
                <View style={styles.itemTopRow}>
                  <Badge label={item.category} variant="info" />
                  <ThemedText variant="headline" style={styles.pointsCostTag}>
                    {item.pointsCost} pts
                  </ThemedText>
                </View>

                <ThemedText variant="headline" style={styles.itemTitle}>
                  {item.title}
                </ThemedText>
                <ThemedText variant="caption" style={styles.itemDesc}>
                  {item.description}
                </ThemedText>

                <Button
                  title={canAfford ? "Redeem ›" : `Need ${item.pointsCost - pointsBalance} more pts`}
                  variant={canAfford ? "primary" : "secondary"}
                  size="sm"
                  disabled={!canAfford}
                  onPress={() => setSelectedReward(item)}
                  style={styles.redeemBtn}
                />
              </Card>
            );
          })}
        </View>
      </ScrollView>

      {selectedReward && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <ThemedText variant="largeTitle" style={styles.modalTitle}>
                Confirm
              </ThemedText>
              <ThemedText variant="subhead" style={styles.modalSub}>
                Swap {selectedReward.pointsCost} points for {selectedReward.title.toLowerCase()}?
              </ThemedText>

              <Card elevation="raised" style={styles.modalCard}>
                <View style={styles.modalRow}>
                  <ThemedText variant="caption">Points balance</ThemedText>
                  <ThemedText variant="subhead">{pointsBalance} pts</ThemedText>
                </View>
                <View style={styles.modalRow}>
                  <ThemedText variant="caption">Cost</ThemedText>
                  <ThemedText variant="subhead" style={styles.costNegative}>–{selectedReward.pointsCost} pts</ThemedText>
                </View>
                <View style={styles.divider} />
                <View style={styles.modalRow}>
                  <ThemedText variant="caption">Remaining balance</ThemedText>
                  <ThemedText variant="headline">{pointsBalance - selectedReward.pointsCost} pts</ThemedText>
                </View>
              </Card>

              <View style={styles.modalActions}>
                <Button
                  title={redeemMutation.isPending ? "Redeeming…" : "Redeem"}
                  size="lg"
                  loading={redeemMutation.isPending}
                  onPress={() => handleRedeem(selectedReward)}
                />
                <Button title="Cancel" variant="ghost" size="md" onPress={() => setSelectedReward(null)} />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginBottom: spacing.xs,
  },
  backText: {
    color: colors.ink,
    fontWeight: "600",
  },
  catalogGrid: {
    gap: spacing.sm,
  },
  voucherRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  costNegative: {
    color: colors.danger,
    fontWeight: "700",
  },
  divider: {
    backgroundColor: colors.separator,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  header: {
    gap: spacing.xxs,
  },
  heroCard: {
    backgroundColor: "#161618",
    borderCurve: "continuous",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  heroLabel: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  heroPoints: {
    color: colors.alwaysWhite,
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -1,
  },
  heroSub: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  heroTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  itemDesc: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  itemTitle: {
    color: colors.label,
    marginTop: 2,
  },
  itemTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalActions: {
    gap: spacing.xs,
    marginTop: spacing.md,
    width: "100%",
  },
  modalCard: {
    backgroundColor: colors.secondaryBackground,
    gap: spacing.xs,
    marginVertical: spacing.md,
    padding: spacing.md,
    width: "100%",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalSheet: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    width: "100%",
  },
  modalSub: {
    color: colors.secondaryLabel,
    marginTop: spacing.xxs,
    textAlign: "center",
  },
  modalTitle: {
    color: colors.label,
    fontWeight: "700",
    textAlign: "center",
  },
  muted: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  pointsCostTag: {
    color: colors.ink,
    fontWeight: "700",
  },
  promoCodePill: {
    backgroundColor: colors.inkSubtle,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  promoCodeText: {
    color: colors.ink,
    fontFamily: "Courier",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  redeemBtn: {
    marginTop: spacing.xs,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    gap: 2,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    color: colors.label,
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 20,
  },
  title: {
    color: colors.label,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
});
