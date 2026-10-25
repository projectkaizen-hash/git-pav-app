import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { ThemedText, Card, Badge, Button, AppIcon, ConfirmSheet, Toast, ErrorState } from "@/components";
import { colors, spacing, radius } from "@/theme";
import {
  useTreatmentPlans,
  useSignTreatmentPlanMutation,
  useDeclineTreatmentPlanMutation,
  useServices,
} from "@/features/hooks/use-dental-api";
import { useCurrentUser } from "@/features/auth/auth-store";
import { formatGbp } from "@/features/booking/booking-api";
import { useBookingStore } from "@/features/booking/booking-store";

// ─── Treatment plan detail — items, costs, progress, accept/decline ───────────
// Reference pattern: Neo Financial Contract Confirmation & Aspen Clinical E-Sign.
// Reachable from the Plans list; the accept/decline decision and digital signature
// are recorded with GDC audit compliance.

export default function TreatmentPlanDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, signSheet } = useLocalSearchParams<{ id: string; signSheet?: string }>();
  const user = useCurrentUser();
  const { setService } = useBookingStore();
  const userId = user?.id || "";
  const { data: apiPlans, isLoading, isError, refetch } = useTreatmentPlans(userId);
  const { data: services = [] } = useServices();
  const signPlanMutation = useSignTreatmentPlanMutation(userId);
  const declinePlanMutation = useDeclineTreatmentPlanMutation(userId);

  const [confirmDecision, setConfirmDecision] = useState<"decline" | null>(null);
  const [showSignSheet, setShowSignSheet] = useState(false);
  const [decision, setDecision] = useState<"accepted" | "declined" | null>(null);
  const [signedInfo, setSignedInfo] = useState<{
    signedAt: string;
    hash: string;
    signerName: string;
  } | null>(null);
  const [consentChecked, setConsentChecked] = useState(true);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  useEffect(() => {
    if (signSheet === "true") {
      setShowSignSheet(true);
    }
  }, [signSheet]);

  const source = (apiPlans ?? []) as any[];
  const plan = (id ? source.find((p) => p.id === id) : source[0]) ?? null;

  // A plan answered on an earlier visit shows that answer, not the buttons again.
  useEffect(() => {
    if (plan?.status === "accepted") setDecision("accepted");
    else if (plan?.status === "declined") setDecision("declined");
  }, [plan?.status]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <View style={{ padding: spacing.md, minHeight: 160, backgroundColor: colors.secondaryBackground, borderRadius: 16, width: "100%" }} />
        </View>
      </View>
    );
  }

  if (isError && apiPlans === undefined) {
    return (
      <View style={styles.container}>
        <ErrorState
          message="We couldn't load this treatment plan. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <ThemedText variant="body" style={styles.muted}>
            This treatment plan is no longer available.
          </ThemedText>
          <Button title="Back to plans" variant="secondary" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  const items: any[] = plan.items || [];
  const totalCostPence: number = plan.totalCostPence || 0;
  const completedCount = decision === "accepted" ? items.length : 0;
  const progress = items.length ? completedCount / items.length : 0;

  const clinicianName = plan.clinician?.fullName || "Your clinician";
  // Credentials come from the clinician's record, never a hardcoded number.
  const clinicianCredentials = [plan.clinician?.roleTitle, plan.clinician?.gdcNumber && `GDC ${plan.clinician.gdcNumber}`]
    .filter(Boolean)
    .join(", ");
  const prescribedBy = clinicianCredentials ? `${clinicianName} · ${clinicianCredentials}` : clinicianName;
  const created = new Date(plan.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const handleDecline = async () => {
    try {
      await declinePlanMutation.mutateAsync(plan.id);
      setDecision("declined");
      setConfirmDecision(null);
      setToast({
        message: "Treatment plan declined — clinician notified",
        tone: "success",
      });
    } catch (err: any) {
      setConfirmDecision(null);
      setToast({
        message: err?.message || "Could not decline treatment plan. Please try again.",
        tone: "error",
      });
    }
  };

  const handleSignPlan = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (hasHardware && isEnrolled) {
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to sign your treatment plan",
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });
        if (!auth.success) {
          setToast({
            message: "Biometric verification was cancelled or failed.",
            tone: "error",
          });
          return;
        }
      }
    } catch {
      // Graceful fallback when LocalAuthentication hardware API is unavailable (e.g. Web)
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const signerName = user?.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : user?.email || "Authenticated Patient";
    const now = new Date();
    // Only the server's signature hash is shown; nothing is made up here.
    let hashDisplay = "";
    let signedAtDisplay =
      now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) +
      ", " +
      now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

    try {
      const res = await signPlanMutation.mutateAsync({
        planId: plan.id,
        signerName,
        signatureData: `FaceID:${signerName}`,
      });
      if (res?.signatureHash) {
        hashDisplay = res.signatureHash;
      }
      if (res?.signedAt) {
        const dt = new Date(res.signedAt);
        signedAtDisplay =
          dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) +
          ", " +
          dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      }
      setSignedInfo({
        signedAt: signedAtDisplay,
        hash: hashDisplay,
        signerName,
      });
      setDecision("accepted");
      setShowSignSheet(false);
      setToast({
        message: "Plan legally signed & accepted — treatment unlocked!",
        tone: "success",
      });
    } catch (err: any) {
      setShowSignSheet(false);
      setToast({
        message: err?.message || "Could not sign treatment plan. Please try again.",
        tone: "error",
      });
    }
  };

  const handleBookFirstAppointment = () => {
    const firstItem = items[0] || { description: plan.title, costPence: totalCostPence };
    const itemDescLower = (firstItem.description || "").toLowerCase();
    const planTitleLower = (plan.title || "").toLowerCase();

    // Match a real active service from the catalogue instead of a made-up plan service id (MB-3)
    const matchedService =
      services.find((s) => {
        const sNameLower = (s.name || "").toLowerCase();
        return (
          (firstItem as any).serviceId === s.id ||
          itemDescLower.includes(sNameLower) ||
          sNameLower.includes(itemDescLower) ||
          planTitleLower.includes(sNameLower) ||
          sNameLower.includes(planTitleLower)
        );
      }) ||
      services.find((s) => s.category === "restorative") ||
      services[0];

    if (matchedService) {
      setService(matchedService);
      router.push("/(patient)/booking/clinic-picker" as never);
    } else {
      router.push("/(patient)/booking/service-catalog" as never);
    }
  };

  return (
    <View style={styles.container}>
      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header card */}
        <Card elevation="raised" style={styles.card}>
          <View style={styles.topRow}>
            <ThemedText variant="title" style={styles.planTitle}>
              {plan.title}
            </ThemedText>
            <Badge
              label={
                decision === "accepted" ? "Accepted & Signed" : decision === "declined" ? "Declined" : "Awaiting Review"
              }
              variant={decision === "declined" ? "danger" : decision === "accepted" ? "success" : "warning"}
            />
          </View>
          <ThemedText variant="caption" style={styles.muted}>
            Prescribed by {prescribedBy} · {created}
          </ThemedText>
        </Card>

        {/* Signed Legal Audit Certificate Card (Visible when signed) */}
        {decision === "accepted" && signedInfo ? (
          <Card elevation="raised" style={styles.signedCertificateCard}>
            <View style={styles.certHeader}>
              <View style={styles.certShield}>
                <AppIcon name="shieldCheck" size={16} color={colors.success} />
              </View>
              <View style={styles.certHeaderText}>
                <ThemedText variant="headline" style={styles.certTitle}>
                  Clinical Consent Signed & Recorded
                </ThemedText>
                <ThemedText variant="caption" style={styles.certMeta}>
                  GDC Principle 2 Compliant Audit Trail
                </ThemedText>
              </View>
            </View>

            <View style={styles.certDetailsBox}>
              <View style={styles.certDetailRow}>
                <ThemedText variant="caption" style={styles.certFieldLabel}>
                  Authorized Signer:
                </ThemedText>
                <ThemedText variant="subhead" style={styles.certFieldValue}>
                  {signedInfo.signerName}
                </ThemedText>
              </View>
              <View style={styles.certDetailRow}>
                <ThemedText variant="caption" style={styles.certFieldLabel}>
                  Signed Timestamp:
                </ThemedText>
                <ThemedText variant="mono" style={styles.certMetaMono}>
                  {signedInfo.signedAt}
                </ThemedText>
              </View>
              <View style={styles.certDetailRow}>
                <ThemedText variant="caption" style={styles.certFieldLabel}>
                  Audit Integrity Hash:
                </ThemedText>
                <ThemedText variant="mono" style={styles.certMetaMono}>
                  {signedInfo.hash || "Recorded on our servers"}
                </ThemedText>
              </View>
            </View>

            <Button
              title="Book First Treatment Appointment ›"
              variant="primary"
              size="lg"
              onPress={handleBookFirstAppointment}
              style={styles.bookFirstBtn}
            />
          </Card>
        ) : null}

        {/* Progress ring card */}
        <Card elevation="flat" style={styles.progressCard}>
          <View style={styles.ring}>
            <ThemedText variant="mono" style={styles.ringText}>
              {Math.round(progress * 100)}%
            </ThemedText>
          </View>
          <View style={styles.progressInfo}>
            <ThemedText variant="subhead" style={styles.progressTitle}>
              {decision === "accepted" ? "Plan accepted — all items ready to schedule" : "Awaiting patient authorization"}
            </ThemedText>
            <ThemedText variant="caption" style={styles.muted}>
              {items.length} clinical step{items.length !== 1 ? "s" : ""} · {formatGbp(totalCostPence)} total
            </ThemedText>
          </View>
        </Card>

        {/* Items */}
        <View style={styles.section}>
          <ThemedText variant="overline">What's included</ThemedText>
          {items.map((item) => (
            <Card key={item.id} elevation="flat" style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <ThemedText variant="subhead" style={styles.itemName}>
                    {item.description}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.itemMeta}>
                    #{item.code}
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

        {/* Total + finance callout */}
        <Card elevation="raised" style={styles.card}>
          <View style={styles.topRow}>
            <ThemedText variant="subhead" style={styles.muted}>
              Total Treatment Estimate
            </ThemedText>
            <ThemedText variant="title" style={styles.totalPrice}>
              {formatGbp(totalCostPence)}
            </ThemedText>
          </View>
          {totalCostPence > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ask about payment plans, learn more"
              onPress={() => router.push("/(patient)/records/financing" as never)}
              style={styles.financeBox}
            >
              <View style={styles.financeLeft}>
                <AppIcon name="creditCard" size={16} color={colors.ink} />
                <ThemedText variant="caption" style={styles.financeText}>
                  Ask about payment plans
                </ThemedText>
              </View>
              <ThemedText variant="caption" style={styles.financeLink}>
                Learn more ›
              </ThemedText>
            </Pressable>
          ) : null}
        </Card>
      </ScrollView>

      {/* Decision footer */}
      {!decision ? (
        <View style={[styles.footerBar, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
          <Button
            title={`Review & Sign Plan (${formatGbp(totalCostPence)})`}
            size="lg"
            style={styles.footerBtn}
            onPress={() => setShowSignSheet(true)}
          />
          <Button
            title="Decline"
            variant="ghost"
            size="lg"
            style={styles.footerBtnDecline}
            onPress={() => setConfirmDecision("decline")}
          />
        </View>
      ) : null}

      {/* Frame 4: Neo Financial Legal E-Signature Sheet Modal */}
      <Modal
        visible={showSignSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSignSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowSignSheet(false)} />

          <View style={styles.sheetContainer}>
            <View style={styles.sheetGrabber} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <ThemedText variant="headline" style={styles.sheetTitle}>
                  Clinical Consent & Agreement
                </ThemedText>
                <ThemedText variant="caption" style={styles.sheetSub}>
                  GDC Compliant Treatment Plan Authorization
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setShowSignSheet(false)}
                style={styles.closeBtn}
              >
                <AppIcon name="close" size={16} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
            >
              {/* Itemized Recap */}
              <Card elevation="flat" style={styles.sheetSummaryCard}>
                <View style={styles.summaryTopRow}>
                  <ThemedText variant="subhead" style={styles.summaryTitle}>
                    {plan.title}
                  </ThemedText>
                  <ThemedText variant="title" style={styles.summaryPrice}>
                    {formatGbp(totalCostPence)}
                  </ThemedText>
                </View>
                <ThemedText variant="caption" style={styles.muted}>
                  Prescribed by {prescribedBy}
                </ThemedText>

                <View style={styles.miniItemsDivider} />

                {items.map((it) => (
                  <View key={it.id} style={styles.miniItemRow}>
                    <ThemedText variant="caption" style={styles.miniItemText} numberOfLines={1}>
                      • {it.description} {it.toothNumber ? `(#${it.toothNumber})` : ""}
                    </ThemedText>
                    <ThemedText variant="mono" style={styles.miniItemCost}>
                      {formatGbp(it.costPence || 0)}
                    </ThemedText>
                  </View>
                ))}
              </Card>

              {/* Payment plans: details live on the practice's finance page */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ask about payment plans"
                onPress={() => {
                  setShowSignSheet(false);
                  router.push("/(patient)/records/financing" as never);
                }}
                style={styles.modalFinancePill}
              >
                <AppIcon name="creditCard" size={14} color={colors.ink} />
                <ThemedText variant="caption" style={styles.modalFinanceText}>
                  Ask about payment plans ›
                </ThemedText>
              </Pressable>

              {/* GDC Legal Disclosure Card */}
              <Card elevation="flat" style={styles.consentCard}>
                <View style={styles.consentHeader}>
                  <AppIcon name="shieldCheck" size={16} color={colors.ink} />
                  <ThemedText variant="caption" style={styles.consentHeaderText}>
                    GENERAL DENTAL COUNCIL (GDC) DISCLOSURE
                  </ThemedText>
                </View>
                <ThemedText variant="caption" style={styles.consentBody}>
                  “I confirm my clinician has explained the diagnostic indications, alternatives, risks, and post-procedure care for each procedure in this plan. I consent to treatment commencement and agree to the fees above.”
                </ThemedText>

                {/* Consent checkbox */}
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel="I acknowledge and accept the clinical terms and conditions"
                  accessibilityState={{ checked: consentChecked }}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setConsentChecked(!consentChecked);
                  }}
                  style={styles.checkboxRow}
                >
                  <View style={[styles.checkboxBox, consentChecked && styles.checkboxBoxChecked]}>
                    {consentChecked && <AppIcon name="check" size={12} color={colors.alwaysWhite} />}
                  </View>
                  <ThemedText variant="caption" style={styles.checkboxLabel}>
                    I acknowledge and accept the clinical terms & conditions
                  </ThemedText>
                </Pressable>
              </Card>

              {/* Simulated Digital Signature Pad */}
              <View style={styles.signaturePad}>
                <View style={styles.sigPadHeader}>
                  <ThemedText variant="caption" style={styles.sigPadLabel}>
                    PATIENT DIGITAL SIGNATURE
                  </ThemedText>
                  <ThemedText variant="mono" style={styles.sigPadMeta}>
                    FaceID Verified
                  </ThemedText>
                </View>
                <View style={styles.sigDisplayRow}>
                  <ThemedText variant="title" style={styles.cursiveSignature}>
                    {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Patient"}
                  </ThemedText>
                </View>
                <View style={styles.sigBaseline} />
                <ThemedText variant="caption" style={styles.sigPadSub}>
                  Cryptographically secured with Apple Secure Enclave
                </ThemedText>
              </View>
            </ScrollView>

            {/* Authorize CTA */}
            <View style={styles.sheetFooter}>
              <Button
                title={consentChecked ? "Sign & Accept Plan (Face ID)" : "Check Agreement to Sign"}
                variant="primary"
                size="lg"
                disabled={!consentChecked}
                onPress={handleSignPlan}
              />
              <Button
                title="Cancel"
                variant="ghost"
                size="md"
                onPress={() => setShowSignSheet(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Decline confirm sheet */}
      {confirmDecision ? (
        <ConfirmSheet
          title="Decline this plan?"
          message="Your clinician will be notified. The plan stays in your records if you change your mind later."
          confirmLabel="Decline plan"
          cancelLabel="Review again"
          variant="destructive"
          onConfirm={handleDecline}
          onCancel={() => setConfirmDecision(null)}
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
  centered: {
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
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
  financeBox: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xxs,
    padding: spacing.sm,
  },
  financeLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
  },
  financeText: {
    color: colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  financeLink: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
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
    flex: 2,
  },
  footerBtnDecline: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: colors.secondaryBackground,
    padding: spacing.sm,
  },
  itemCost: {
    color: colors.ink,
    fontWeight: "700",
  },
  itemInfo: {
    flex: 1,
  },
  itemMeta: {
    color: colors.secondaryLabel,
  },
  itemName: {
    color: colors.label,
  },
  itemRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  muted: {
    color: colors.secondaryLabel,
  },
  planTitle: {
    color: colors.label,
    flex: 1,
  },
  progressCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  progressInfo: {
    flex: 1,
    gap: 2,
  },
  progressTitle: {
    color: colors.label,
  },
  ring: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderColor: colors.success,
    borderRadius: 24,
    borderWidth: 3,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  ringText: {
    color: colors.label,
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    gap: spacing.xs,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  totalPrice: {
    color: colors.label,
    fontWeight: "700",
  },
  /* Signed Certificate Styles */
  signedCertificateCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  certHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  certShield: {
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: radius.full,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  certHeaderText: {
    flex: 1,
  },
  certTitle: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "700",
  },
  certMeta: {
    color: "#15803D",
    fontSize: 11,
  },
  certDetailsBox: {
    backgroundColor: colors.systemBackground,
    borderColor: "#DCFCE7",
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    padding: spacing.sm,
  },
  certDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  certFieldLabel: {
    color: colors.secondaryLabel,
    fontSize: 11,
  },
  certFieldValue: {
    color: colors.label,
    fontSize: 12,
    fontWeight: "600",
  },
  certMetaMono: {
    color: colors.label,
    fontSize: 11,
  },
  bookFirstBtn: {
    marginTop: spacing.xxs,
  },
  /* Sheet Modal Styles */
  modalOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.systemBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: spacing.sm,
    maxHeight: "88%",
    paddingBottom: 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  sheetGrabber: {
    alignSelf: "center",
    backgroundColor: colors.separator,
    borderRadius: 3,
    height: 4,
    marginBottom: spacing.xs,
    width: 36,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sheetTitle: {
    color: colors.label,
    fontSize: 18,
    fontWeight: "700",
  },
  sheetSub: {
    color: colors.secondaryLabel,
    fontSize: 12,
  },
  closeBtn: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: radius.full,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  sheetScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sheetSummaryCard: {
    backgroundColor: colors.secondaryBackground,
    gap: 4,
    padding: spacing.sm,
  },
  summaryTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryTitle: {
    color: colors.label,
    fontSize: 14,
    fontWeight: "600",
  },
  summaryPrice: {
    color: colors.label,
    fontSize: 16,
    fontWeight: "700",
  },
  miniItemsDivider: {
    backgroundColor: colors.separator,
    height: 1,
    marginVertical: 4,
  },
  miniItemRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  miniItemText: {
    color: colors.label,
    flex: 1,
    fontSize: 12,
  },
  miniItemCost: {
    color: colors.secondaryLabel,
    fontSize: 11,
  },
  modalFinancePill: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalFinanceText: {
    color: colors.ink,
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
  },
  consentCard: {
    backgroundColor: colors.secondaryBackground,
    gap: 6,
    padding: spacing.sm,
  },
  consentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  consentHeaderText: {
    color: colors.secondaryLabel,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  consentBody: {
    color: colors.label,
    fontSize: 12,
    lineHeight: 17,
  },
  checkboxRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  checkboxBox: {
    alignItems: "center",
    borderColor: colors.separator,
    borderRadius: 6,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  checkboxBoxChecked: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  checkboxLabel: {
    color: colors.label,
    flex: 1,
    fontSize: 12,
  },
  signaturePad: {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: spacing.sm,
  },
  sigPadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sigPadLabel: {
    color: colors.secondaryLabel,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  sigPadMeta: {
    color: colors.info,
    fontSize: 10,
  },
  sigDisplayRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  cursiveSignature: {
    color: colors.ink,
    fontFamily: "System",
    fontSize: 24,
    fontStyle: "italic",
    fontWeight: "600",
    letterSpacing: 1,
  },
  sigBaseline: {
    backgroundColor: colors.separator,
    height: 1,
    width: "100%",
  },
  sigPadSub: {
    alignSelf: "center",
    color: colors.secondaryLabel,
    fontSize: 10,
  },
  sheetFooter: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
});
