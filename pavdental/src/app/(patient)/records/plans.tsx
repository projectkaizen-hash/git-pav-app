import React, { useState } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { ThemedText, Card, Button, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { useTreatmentPlans } from "@/features/hooks/use-dental-api";
import { useCurrentUser } from "@/features/auth/auth-store";
import { formatGbp } from "@/features/booking/booking-api";

export default function TreatmentPlansScreen() {
  const user = useCurrentUser();
  const userId = user?.id || "00000000-0000-0000-0000-000000000000";
  const { data: plans, isLoading, isError } = useTreatmentPlans(userId);

  const [acceptedPlanIds, setAcceptedPlanIds] = useState<Set<string>>(new Set());

  const handleAcceptPlan = (planId: string) => {
    setAcceptedPlanIds((prev) => new Set([...prev, planId]));
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centeredState]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <ThemedText variant="caption" style={styles.sub}>
          Loading your treatment plans...
        </ThemedText>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centeredState]}>
        <ThemedText variant="headline" style={{ color: colors.danger }}>
          Could not load treatment plans
        </ThemedText>
        <ThemedText variant="caption" style={styles.sub}>
          Please check your network connection.
        </ThemedText>
      </View>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <View style={[styles.container, styles.centeredState]}>
        <ThemedText variant="headline">No Treatment Plans</ThemedText>
        <ThemedText variant="caption" style={styles.sub}>
          You don't have any active treatment plans from your clinician.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Treatment Plans
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            {plans.length} plan{plans.length !== 1 ? "s" : ""} prescribed by your clinician.
          </ThemedText>
        </View>

        {plans.map((plan: any) => {
          const isAccepted = acceptedPlanIds.has(plan.id) || plan.status === "completed" || plan.status === "accepted";
          const clinicianName = plan.clinician?.fullName
            ? `${plan.clinician.fullName} (${plan.clinician.roleTitle || ""})`
            : "Your Clinician";
          const createdAt = new Date(plan.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          const totalCostPence = plan.totalCostPence || 0;

          return (
            <View key={plan.id}>
              {/* Plan Header Card */}
              <Card elevation="raised" style={styles.card}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="headline" style={styles.planTitle}>
                    {plan.title}
                  </ThemedText>
                  <Badge
                    label={isAccepted ? "Accepted & Signed" : "Pending Signature"}
                    variant={isAccepted ? "success" : "warning"}
                  />
                </View>
                <ThemedText variant="caption" style={styles.legalNotice}>
                  Prescribed by {clinicianName} on {createdAt}.
                </ThemedText>
                <ThemedText variant="caption" style={styles.legalNotice}>
                  Itemised breakdown of recommended clinical interventions according to UK Private & NHS scale rules.
                </ThemedText>
              </Card>

              {/* Itemised Procedures List */}
              <View style={styles.section}>
                <ThemedText variant="headline">Procedures Included</ThemedText>
                {(plan.items || []).map((item: any) => (
                  <Card key={item.id} style={styles.itemCard}>
                    <View style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <ThemedText variant="headline" style={styles.itemName}>
                          {item.description}
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.itemCode}>
                          Clinical Code: #{item.code}
                          {item.toothNumber ? ` · Tooth #${item.toothNumber}` : ""}
                        </ThemedText>
                      </View>
                      <ThemedText variant="mono" style={styles.itemCost}>
                        {formatGbp(item.costPence || 0)}
                      </ThemedText>
                    </View>
                  </Card>
                ))}
              </View>

              {/* Total & Finance */}
              <Card elevation="raised" style={styles.totalCard}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="headline">Total Treatment Cost:</ThemedText>
                  <ThemedText variant="mono" style={styles.totalPrice}>
                    {formatGbp(totalCostPence)}
                  </ThemedText>
                </View>
                {totalCostPence > 0 && (
                  <View style={styles.financeBox}>
                    <ThemedText variant="caption" style={styles.financeTitle}>
                      💳 0% Interest Finance Available:
                    </ThemedText>
                    <ThemedText variant="caption" style={styles.financeBody}>
                      Spread over 6 months at {formatGbp(Math.round(totalCostPence / 6))} / month with Tabeo / Chrysalis.
                    </ThemedText>
                  </View>
                )}
              </Card>

              {isAccepted ? (
                <View style={styles.signatureBox}>
                  <ThemedText variant="caption" style={styles.sigText}>
                    ✓ Digitally signed and accepted.
                  </ThemedText>
                </View>
              ) : (
                <View style={styles.footer}>
                  <Button
                    title={`Digitally Accept Plan (${formatGbp(totalCostPence)})`}
                    size="lg"
                    onPress={() => handleAcceptPlan(plan.id)}
                  />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  centeredState: {
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.xl,
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
  financeBody: {
    color: colors.brand,
  },
  financeBox: {
    backgroundColor: colors.brandSubtle,
    borderRadius: 8,
    gap: 2,
    padding: spacing.sm,
  },
  financeTitle: {
    color: colors.brand,
    fontWeight: "700",
  },
  footer: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  header: {
    gap: spacing.xxs,
  },
  itemCard: {
    backgroundColor: colors.secondaryBackground,
    padding: spacing.md,
  },
  itemCode: {
    color: colors.secondaryLabel,
  },
  itemCost: {
    color: colors.brand,
    fontWeight: "700",
  },
  itemInfo: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  itemName: {
    color: colors.label,
  },
  itemRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legalNotice: {
    color: colors.secondaryLabel,
    lineHeight: 16,
    marginTop: 2,
  },
  planTitle: {
    color: colors.label,
    flex: 1,
    paddingRight: spacing.xs,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  section: {
    gap: spacing.xs,
  },
  sigText: {
    color: colors.success,
    fontWeight: "600",
  },
  signatureBox: {
    alignItems: "center",
    backgroundColor: colors.successSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  sub: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
  totalCard: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
    padding: spacing.md,
  },
  totalPrice: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: "700",
  },
});
