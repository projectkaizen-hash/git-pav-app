import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button, AppIcon, Badge, Toast } from "@/components";
import { colors, spacing, radius } from "@/theme";
import { useRewards, useRedeemRewardMutation } from "@/features/hooks/use-dental-api";

interface RewardItem {
  id: string;
  title: string;
  category: string;
  pointsCost: number;
  description: string;
  icon: "zap" | "star" | "sparkles" | "check";
  inStock: boolean;
}

const rewardsCatalog: RewardItem[] = [
  {
    id: "rw_1",
    title: "Philips Sonicare Heads (3-Pack)",
    category: "Preventative",
    pointsCost: 800,
    description: "C3 Premium Plaque Defence replacement brush heads with RFID sync.",
    icon: "sparkles",
    inStock: true,
  },
  {
    id: "rw_2",
    title: "AirFlow® Stain Removal Booster",
    category: "In-Clinic Upgrade",
    pointsCost: 1200,
    description: "Complimentary high-pressure sodium bicarbonate polish at your next hygiene visit.",
    icon: "zap",
    inStock: true,
  },
  {
    id: "rw_3",
    title: "Boutique Whitening Refill Syringe",
    category: "Cosmetic",
    pointsCost: 1800,
    description: "16% Carbamide Peroxide overnight home top-up syringe (requires custom trays).",
    icon: "star",
    inStock: true,
  },
  {
    id: "rw_4",
    title: "£25 Practice Treatment Credit",
    category: "Voucher",
    pointsCost: 2500,
    description: "Direct credit voucher applied to any filling, crown, or dental checkup.",
    icon: "check",
    inStock: true,
  },
];

export default function OralHealthPerksScreen() {
  const router = useRouter();
  const { data: rewardsData } = useRewards();
  const redeemMutation = useRedeemRewardMutation();
  const [pointsBalance, setPointsBalance] = useState<number>(1450);
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    if (typeof rewardsData?.pointsBalance === "number") {
      setPointsBalance(rewardsData.pointsBalance);
    }
  }, [rewardsData?.pointsBalance]);

  const nextTierPoints = 2000;
  const progressRatio = Math.min(1, pointsBalance / nextTierPoints);

  const handleRedeem = async (item: RewardItem) => {
    if (pointsBalance < item.pointsCost) {
      Alert.alert(
        "Insufficient Points",
        `You need ${item.pointsCost - pointsBalance} more points to redeem this perk. Keep up your daily brushing streak!`
      );
      return;
    }

    try {
      const res = await redeemMutation.mutateAsync({
        rewardId: item.id,
      });
      if (typeof res?.pointsBalance === "number") {
        setPointsBalance(res.pointsBalance);
      } else {
        setPointsBalance((prev) => prev - item.pointsCost);
      }
      const code = res?.voucherCode || res?.redemption?.voucherCode || `PAV-${item.id.toUpperCase()}`;
      setSelectedReward(null);
      setToast({
        message: `Redeemed ${item.title}! Code: ${code}`,
        tone: "success",
      });
    } catch (err: any) {
      setSelectedReward(null);
      setToast({
        message: err?.message || "Could not redeem perk",
        tone: "error",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <AppIcon name="chevronLeft" size={20} color={colors.ink} />
            <ThemedText variant="subhead" style={styles.backText}>Back</ThemedText>
          </Pressable>
          <ThemedText variant="largeTitle" style={styles.title}>
            Perks & Rewards
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Earn points from daily brushing streaks and checkups to redeem in-clinic rewards.
          </ThemedText>
        </View>

        {/* Hero Points Card (Neo Financial Style) */}
        <Card elevation="raised" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <ThemedText variant="caption" style={styles.heroLabel}>ORAL HEALTH REWARDS</ThemedText>
              <ThemedText variant="largeTitle" style={styles.heroPoints}>
                {pointsBalance.toLocaleString()}
              </ThemedText>
              <ThemedText variant="caption" style={styles.heroSub}>
                Points Available to Spend
              </ThemedText>
            </View>
            <Badge label="GOLD TIER" variant="warning" />
          </View>

          {/* Progress Bar to Platinum */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabels}>
              <ThemedText variant="caption" style={styles.progressText}>
                Gold ({pointsBalance} pts)
              </ThemedText>
              <ThemedText variant="caption" style={styles.progressText}>
                Platinum ({nextTierPoints} pts)
              </ThemedText>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
            </View>
            <ThemedText variant="caption" style={styles.tierMuted}>
              {nextTierPoints - pointsBalance} pts until Platinum (+15% points multiplier)
            </ThemedText>
          </View>
        </Card>

        {/* Daily Streak Tracker Card */}
        <Card style={styles.streakCard}>
          <View style={styles.streakRow}>
            <View style={styles.flameIconBox}>
              <AppIcon name="zap" size={22} color={colors.alwaysWhite} />
            </View>
            <View style={styles.streakTextCol}>
              <ThemedText variant="headline">14-Day Brushing Streak! 🔥</ThemedText>
              <ThemedText variant="caption" style={styles.muted}>
                Brushed twice daily for 2 mins. +10 bonus points rewarded today.
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Rewards Store */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Redeem Rewards Catalog
          </ThemedText>
          <ThemedText variant="caption" style={styles.muted}>
            Tap any item to exchange your points
          </ThemedText>
        </View>

        <View style={styles.catalogGrid}>
          {rewardsCatalog.map((item) => {
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
                  title={canAfford ? "Redeem Perk ›" : `Need ${item.pointsCost - pointsBalance} more pts`}
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

        {/* Partner Perks Directory */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Partner Discounts & Cashback
          </ThemedText>
          <ThemedText variant="caption" style={styles.muted}>
            Exclusive discounts for Pav Dental registered patients
          </ThemedText>
        </View>

        <Card style={styles.partnerCard}>
          <View style={styles.partnerRow}>
            <View style={styles.partnerInfo}>
              <ThemedText variant="headline">Boots Pharmacy</ThemedText>
              <ThemedText variant="caption" style={styles.muted}>
                15% off all toothbrushes, floss & dental rinses.
              </ThemedText>
            </View>
            <View style={styles.promoCodePill}>
              <ThemedText variant="caption" style={styles.promoCodeText}>PAVBOOTS15</ThemedText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.partnerRow}>
            <View style={styles.partnerInfo}>
              <ThemedText variant="headline">Philips Sonicare</ThemedText>
              <ThemedText variant="caption" style={styles.muted}>
                20% discount on DiamondClean smart toothbrushes.
              </ThemedText>
            </View>
            <View style={styles.promoCodePill}>
              <ThemedText variant="caption" style={styles.promoCodeText}>PAVSONIC20</ThemedText>
            </View>
          </View>
        </Card>
      </ScrollView>

      {/* Redemption Confirmation Modal */}
      {selectedReward && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <ThemedText variant="largeTitle" style={styles.modalTitle}>
                Confirm Redemption
              </ThemedText>
              <ThemedText variant="subhead" style={styles.modalSub}>
                Are you sure you want to redeem {selectedReward.title} for {selectedReward.pointsCost} points?
              </ThemedText>

              <Card elevation="raised" style={styles.modalCard}>
                <View style={styles.modalRow}>
                  <ThemedText variant="caption">Points Balance</ThemedText>
                  <ThemedText variant="subhead">{pointsBalance} pts</ThemedText>
                </View>
                <View style={styles.modalRow}>
                  <ThemedText variant="caption">Redemption Cost</ThemedText>
                  <ThemedText variant="subhead" style={styles.costNegative}>–{selectedReward.pointsCost} pts</ThemedText>
                </View>
                <View style={styles.divider} />
                <View style={styles.modalRow}>
                  <ThemedText variant="caption">Remaining Balance</ThemedText>
                  <ThemedText variant="headline">{pointsBalance - selectedReward.pointsCost} pts</ThemedText>
                </View>
              </Card>

              <View style={styles.modalActions}>
                <Button
                  title={`Confirm & Deduct ${selectedReward.pointsCost} Pts`}
                  size="lg"
                  onPress={() => handleRedeem(selectedReward)}
                />
                <Button
                  title="Cancel"
                  variant="ghost"
                  size="md"
                  onPress={() => setSelectedReward(null)}
                />
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
  costNegative: {
    color: colors.danger,
    fontWeight: "700",
  },
  divider: {
    backgroundColor: colors.separator,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  flameIconBox: {
    alignItems: "center",
    backgroundColor: "#F97316",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
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
  partnerCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  partnerInfo: {
    flex: 1,
    gap: 2,
  },
  partnerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  pointsCostTag: {
    color: colors.ink,
    fontWeight: "700",
  },
  progressBarBg: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 4,
    height: 8,
    overflow: "hidden",
    width: "100%",
  },
  progressBarFill: {
    backgroundColor: "#10B981",
    borderRadius: 4,
    height: "100%",
  },
  progressContainer: {
    gap: spacing.xxs,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
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
  streakCard: {
    backgroundColor: colors.secondaryBackground,
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  streakRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  streakTextCol: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 20,
  },
  tierMuted: {
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  title: {
    color: colors.label,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
});
