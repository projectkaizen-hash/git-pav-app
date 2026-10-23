import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button, AppIcon, ChipPill } from "@/components";
import { colors, spacing, radius } from "@/theme";
import { useFinancing, useApplyFinancingMutation } from "@/features/hooks/use-dental-api";

export default function DentalFinancingScreen() {
  const router = useRouter();
  const { data: financingData } = useFinancing();
  const applyMutation = useApplyFinancingMutation();

  // State for financing calculator
  const [treatmentCost, setTreatmentCost] = useState<number>(1850);
  const [durationMonths, setDurationMonths] = useState<6 | 12 | 24>(24);
  const [isPreApprovedModal, setIsPreApprovedModal] = useState<boolean>(false);
  const [hasApplied, setHasApplied] = useState<boolean>(false);

  useEffect(() => {
    if (financingData?.applications?.length > 0) {
      setHasApplied(true);
    }
  }, [financingData]);

  // Quick preset treatments
  const presets = [
    { label: "Hygiene & Filling", amount: 280 },
    { label: "Invisalign Go", amount: 1450 },
    { label: "Implant & Crown", amount: 1850 },
    { label: "Full Smile Veneers", amount: 3600 },
  ];

  // Repayment math (0% Representative APR)
  const monthlyRepayment = (treatmentCost / durationMonths).toFixed(2);
  const typicalCreditCardInterest = (treatmentCost * 0.229 * (durationMonths / 12)).toFixed(0);

  const handleRunEligibilityCheck = async () => {
    try {
      await applyMutation.mutateAsync({
        treatmentCostPence: Math.round(treatmentCost * 100),
        durationMonths,
      });
      setIsPreApprovedModal(true);
      setHasApplied(true);
    } catch (err: any) {
      Alert.alert(
        "Eligibility Check Failed",
        err?.message || "Could not complete eligibility check right now. Please try again."
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            0% Treatment Financing
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Spread treatment costs over 6, 12, or 24 months with zero interest. FCA regulated.
          </ThemedText>
        </View>

        {/* Neo Financial Virtual Card Hero */}
        <View style={styles.virtualCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardBranding}>
              <ThemedText variant="caption" style={styles.cardLogoSuper}>PAV DENTAL</ThemedText>
              <ThemedText variant="headline" style={styles.cardLogo}>Health Credit</ThemedText>
            </View>
            <View style={styles.cardChip}>
              <View style={styles.chipInner} />
            </View>
          </View>

          <View style={styles.cardMidRow}>
            <ThemedText variant="caption" style={styles.cardLimitLabel}>Available Pre-Approved Limit</ThemedText>
            <ThemedText variant="largeTitle" style={styles.cardLimitVal}>£4,000.00</ThemedText>
          </View>

          <View style={styles.cardBottomRow}>
            <View style={styles.cardBadge}>
              <ThemedText variant="caption" style={styles.cardBadgeText}>0% PROMO APR</ThemedText>
            </View>
            <ThemedText variant="caption" style={styles.cardNumberMask}>•••• 8842</ThemedText>
          </View>
        </View>

        {/* Interactive Treatment Amount Presets */}
        <Card elevation="raised" style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText variant="headline">Treatment Estimate</ThemedText>
            <ThemedText variant="largeTitle" style={styles.costBigVal}>
              £{treatmentCost.toLocaleString("en-GB")}
            </ThemedText>
          </View>

          <ThemedText variant="caption" style={styles.muted}>
            Select a common procedure or customize your required treatment amount:
          </ThemedText>

          <View style={styles.presetsRow}>
            {presets.map((p) => {
              const isSelected = treatmentCost === p.amount;
              return (
                <ChipPill
                  key={p.label}
                  label={`${p.label} (£${p.amount})`}
                  selected={isSelected}
                  onPress={() => setTreatmentCost(p.amount)}
                />
              );
            })}
          </View>

          {/* Stepper buttons to adjust cost */}
          <View style={styles.adjustRow}>
            <Button
              title="– £100"
              size="sm"
              variant="secondary"
              onPress={() => setTreatmentCost((prev) => Math.max(300, prev - 100))}
            />
            <ThemedText variant="subhead" style={styles.adjustLabel}>
              Adjust in £100 increments
            </ThemedText>
            <Button
              title="+ £100"
              size="sm"
              variant="secondary"
              onPress={() => setTreatmentCost((prev) => Math.min(6000, prev + 100))}
            />
          </View>
        </Card>

        {/* Duration Selection (6, 12, 24 Months) */}
        <Card elevation="raised" style={styles.sectionCard}>
          <ThemedText variant="headline">Repayment Term</ThemedText>
          <ThemedText variant="caption" style={styles.muted}>
            All terms include 0% promotional interest. No early repayment fees.
          </ThemedText>

          <View style={styles.termPillsRow}>
            <Pressable
              onPress={() => setDurationMonths(6)}
              style={[styles.termBox, durationMonths === 6 && styles.termBoxSelected]}
            >
              <ThemedText variant="headline" style={[styles.termMonths, durationMonths === 6 && styles.termTextSelected]}>
                6 Months
              </ThemedText>
              <ThemedText variant="caption" style={[styles.termApr, durationMonths === 6 && styles.termTextSelected]}>
                0% APR · £{(treatmentCost / 6).toFixed(0)}/mo
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setDurationMonths(12)}
              style={[styles.termBox, durationMonths === 12 && styles.termBoxSelected]}
            >
              <ThemedText variant="headline" style={[styles.termMonths, durationMonths === 12 && styles.termTextSelected]}>
                12 Months
              </ThemedText>
              <ThemedText variant="caption" style={[styles.termApr, durationMonths === 12 && styles.termTextSelected]}>
                0% APR · £{(treatmentCost / 12).toFixed(0)}/mo
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setDurationMonths(24)}
              style={[styles.termBox, durationMonths === 24 && styles.termBoxSelected]}
            >
              <View style={styles.popularTag}>
                <ThemedText variant="caption" style={styles.popularTagText}>POPULAR</ThemedText>
              </View>
              <ThemedText variant="headline" style={[styles.termMonths, durationMonths === 24 && styles.termTextSelected]}>
                24 Months
              </ThemedText>
              <ThemedText variant="caption" style={[styles.termApr, durationMonths === 24 && styles.termTextSelected]}>
                0% APR · £{(treatmentCost / 24).toFixed(0)}/mo
              </ThemedText>
            </Pressable>
          </View>
        </Card>

        {/* Calculation Summary Card */}
        <Card elevation="raised" style={styles.summaryCard}>
          <ThemedText variant="headline" style={styles.summaryTitle}>
            Monthly Repayment Breakdown
          </ThemedText>

          <View style={styles.repaymentRow}>
            <ThemedText variant="largeTitle" style={styles.monthlyBig}>
              £{monthlyRepayment}
            </ThemedText>
            <ThemedText variant="subhead" style={styles.monthlyPer}>
              / month for {durationMonths} months
            </ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <ThemedText variant="subhead" style={styles.breakdownLabel}>Treatment Principal</ThemedText>
            <ThemedText variant="headline">£{treatmentCost.toFixed(2)}</ThemedText>
          </View>

          <View style={styles.breakdownRow}>
            <ThemedText variant="subhead" style={styles.breakdownLabel}>Interest Paid (0% APR)</ThemedText>
            <ThemedText variant="headline" style={styles.zeroCost}>£0.00</ThemedText>
          </View>

          <View style={styles.breakdownRow}>
            <ThemedText variant="subhead" style={styles.breakdownLabel}>Total Amount Payable</ThemedText>
            <ThemedText variant="headline">£{treatmentCost.toFixed(2)}</ThemedText>
          </View>

          <View style={styles.interestSavedBanner}>
            <AppIcon name="check" size={16} color={colors.success} />
            <ThemedText variant="caption" style={styles.savedText}>
              You save approx. £{typicalCreditCardInterest} in interest compared to typical credit cards (22.9% APR).
            </ThemedText>
          </View>
        </Card>

        {/* Soft Credit Check Callout & Action */}
        <Card style={styles.preQualCard}>
          <View style={styles.preQualTop}>
            <AppIcon name="shield" size={20} color={colors.ink} />
            <View style={styles.preQualTextCol}>
              <ThemedText variant="headline">Instant Soft Search</ThemedText>
              <ThemedText variant="caption" style={styles.muted}>
                Checking your eligibility will NOT impact your credit rating. Decision takes under 60 seconds.
              </ThemedText>
            </View>
          </View>

          <Button
            title={hasApplied ? "View Pre-Approved Agreement ›" : "Check Eligibility (No Credit Impact) ›"}
            size="lg"
            loading={applyMutation.isPending}
            onPress={handleRunEligibilityCheck}
          />
        </Card>

        {/* 3 Step Walkthrough */}
        <View style={styles.stepsCard}>
          <ThemedText variant="overline" style={styles.stepsHeading}>HOW IT WORKS</ThemedText>
          <View style={styles.stepItem}>
            <ThemedText variant="headline" style={styles.stepNum}>1</ThemedText>
            <View style={styles.stepContent}>
              <ThemedText variant="headline">Soft Eligibility Check</ThemedText>
              <ThemedText variant="caption" style={styles.muted}>Verify UK address and income with no footprint on your credit file.</ThemedText>
            </View>
          </View>
          <View style={styles.stepItem}>
            <ThemedText variant="headline" style={styles.stepNum}>2</ThemedText>
            <View style={styles.stepContent}>
              <ThemedText variant="headline">Pick Your Term</ThemedText>
              <ThemedText variant="caption" style={styles.muted}>Choose 6, 12, or 24 months with 0% fixed interest.</ThemedText>
            </View>
          </View>
          <View style={styles.stepItem}>
            <ThemedText variant="headline" style={styles.stepNum}>3</ThemedText>
            <View style={styles.stepContent}>
              <ThemedText variant="headline">Treatment Commences</ThemedText>
              <ThemedText variant="caption" style={styles.muted}>First monthly direct debit occurs 30 days following clinical completion.</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Pre-Approval Success Modal */}
      <Modal visible={isPreApprovedModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalCheck}>
              <AppIcon name="check" size={32} color={colors.alwaysWhite} />
            </View>
            <ThemedText variant="largeTitle" style={styles.modalTitle}>
              You're Pre-Approved!
            </ThemedText>
            <ThemedText variant="subhead" style={styles.modalSubtitle}>
              You have been pre-approved for up to £4,000 at 0% APR for your dental care at Pav Dental.
            </ThemedText>

            <Card elevation="raised" style={styles.modalDetailsCard}>
              <View style={styles.breakdownRow}>
                <ThemedText variant="caption">Selected Plan</ThemedText>
                <ThemedText variant="subhead">£{treatmentCost.toFixed(2)} ({durationMonths} mo)</ThemedText>
              </View>
              <View style={styles.breakdownRow}>
                <ThemedText variant="caption">Monthly Direct Debit</ThemedText>
                <ThemedText variant="headline">£{monthlyRepayment} / mo</ThemedText>
              </View>
              <View style={styles.breakdownRow}>
                <ThemedText variant="caption">Promotional APR</ThemedText>
                <ThemedText variant="subhead" style={styles.zeroCost}>0.0% Fixed</ThemedText>
              </View>
            </Card>

            <View style={styles.modalActions}>
              <Button
                title="Link to Treatment Plan ›"
                size="lg"
                onPress={() => {
                  setIsPreApprovedModal(false);
                  router.push("/(patient)/records/plans" as any);
                }}
              />
              <Button
                title="Done"
                variant="ghost"
                size="md"
                onPress={() => setIsPreApprovedModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  adjustLabel: {
    color: colors.secondaryLabel,
  },
  adjustRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  breakdownLabel: {
    color: colors.secondaryLabel,
  },
  breakdownRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  cardBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardBadgeText: {
    color: colors.alwaysWhite,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cardBottomRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  cardBranding: {
    gap: 1,
  },
  cardChip: {
    backgroundColor: "#D4AF37",
    borderColor: "#AA8C2C",
    borderRadius: 6,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 38,
  },
  cardLimitLabel: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  cardLimitVal: {
    color: colors.alwaysWhite,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  cardLogo: {
    color: colors.alwaysWhite,
    fontWeight: "700",
  },
  cardLogoSuper: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  cardMidRow: {
    gap: 2,
    marginVertical: spacing.sm,
  },
  cardNumberMask: {
    color: "rgba(255, 255, 255, 0.6)",
    fontWeight: "600",
    letterSpacing: 1,
  },
  cardTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chipInner: {
    borderColor: "rgba(0, 0, 0, 0.2)",
    borderWidth: 1,
    height: "50%",
    width: "100%",
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
  costBigVal: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "800",
  },
  divider: {
    backgroundColor: colors.separator,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  header: {
    gap: spacing.xxs,
  },
  interestSavedBanner: {
    alignItems: "center",
    backgroundColor: colors.successSubtle,
    borderCurve: "continuous",
    borderRadius: 8,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  modalActions: {
    gap: spacing.xs,
    marginTop: spacing.sm,
    width: "100%",
  },
  modalCheck: {
    alignItems: "center",
    backgroundColor: colors.success,
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 72,
  },
  modalDetailsCard: {
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
  modalSheet: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    width: "100%",
  },
  modalSubtitle: {
    color: colors.secondaryLabel,
    marginTop: spacing.xxs,
    textAlign: "center",
  },
  modalTitle: {
    color: colors.label,
    fontWeight: "700",
    textAlign: "center",
  },
  monthlyBig: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  monthlyPer: {
    color: colors.secondaryLabel,
  },
  muted: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  popularTag: {
    backgroundColor: colors.ink,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    position: "absolute",
    right: 8,
    top: -8,
  },
  popularTagText: {
    color: colors.alwaysWhite,
    fontSize: 9,
    fontWeight: "800",
  },
  preQualCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  preQualTextCol: {
    flex: 1,
    gap: 2,
  },
  preQualTop: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginVertical: spacing.xxs,
  },
  repaymentRow: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: spacing.xs,
  },
  savedText: {
    color: colors.success,
    flex: 1,
    fontWeight: "600",
    lineHeight: 16,
  },
  sectionCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepContent: {
    flex: 1,
    gap: 1,
  },
  stepItem: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  stepNum: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 14,
    color: colors.ink,
    height: 28,
    justifyContent: "center",
    lineHeight: 28,
    textAlign: "center",
    width: 28,
  },
  stepsCard: {
    backgroundColor: colors.secondaryBackground,
    borderCurve: "continuous",
    borderRadius: radius.xl,
    gap: spacing.md,
    padding: spacing.md,
  },
  stepsHeading: {
    color: colors.tertiaryLabel,
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: colors.secondaryBackground,
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  summaryTitle: {
    color: colors.label,
  },
  termApr: {
    color: colors.secondaryLabel,
  },
  termBox: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    paddingVertical: spacing.sm,
  },
  termBoxSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  termMonths: {
    color: colors.label,
    fontWeight: "700",
  },
  termPillsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  termTextSelected: {
    color: colors.alwaysWhite,
  },
  title: {
    color: colors.label,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  virtualCard: {
    backgroundColor: "#161618",
    borderCurve: "continuous",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    elevation: 4,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  zeroCost: {
    color: colors.success,
  },
});
