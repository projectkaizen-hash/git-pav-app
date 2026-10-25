import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button, AppIcon, ChipPill, ProgressPills, Input } from "@/components";
import { colors, spacing, radius } from "@/theme";
import { useCurrentUser } from "@/features/auth/auth-store";
import { updatePatientProfile } from "@/features/records/records-api";
import { useOnboardingStore } from "@/features/onboarding/onboarding-store";

type Step = "scan" | "preview" | "confirmed";
const INSURERS = ["Denplan", "Bupa Dental", "AXA Health", "Simplyhealth"];

export default function BookingInsuranceScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const savedInsurance = useOnboardingStore((s) => s.insurance);
  const setInsurance = useOnboardingStore((s) => s.setInsurance);
  const [step, setStep] = useState<Step>("scan");
  const [provider, setProvider] = useState(savedInsurance?.provider || "Denplan");
  const [policyNumber, setPolicyNumber] = useState(savedInsurance?.policyNumber || "");

  const confirm = async () => {
    const trimmedProvider = provider.trim() || "Denplan";
    const trimmedPolicy = policyNumber.trim();
    setInsurance({ provider: trimmedProvider, policyNumber: trimmedPolicy });
    setStep("confirmed");
    if (user?.id) {
      await updatePatientProfile(user.id, {
        insuranceProvider: trimmedProvider,
        insurancePolicyNumber: trimmedPolicy,
      }).catch(() => {});
    }
    router.push("/(patient)/booking/summary");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ProgressPills total={5} current={5} />
          <ThemedText variant="largeTitle" style={styles.title}>
            Insurance & eligibility
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Scan your policy so covered treatments are claimed automatically — you only pay what's left.
          </ThemedText>
        </View>

        {step === "scan" ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan insurance card"
              onPress={() => setStep("preview")}
              style={({ pressed }) => [styles.scanBox, pressed && { opacity: 0.85 }]}
            >
              <AppIcon name="camera" size={28} color={colors.ink} />
              <ThemedText variant="subhead" style={styles.scanTitle}>
                Scan your card
              </ThemedText>
              <ThemedText variant="caption" style={styles.scanSub}>
                Fit the card inside the frame. We read the insurer and policy number automatically.
              </ThemedText>
            </Pressable>

            <View style={styles.choiceRow}>
              {INSURERS.map((ins) => (
                <ChipPill
                  key={ins}
                  label={ins}
                  selected={provider === ins}
                  onPress={() => setProvider(ins)}
                />
              ))}
            </View>

            <Input
              label="Insurance Provider"
              placeholder="e.g. Denplan"
              value={provider}
              onChangeText={setProvider}
            />

            <Input
              label="Membership / Policy Number"
              placeholder="e.g. DP-4471-8820"
              value={policyNumber}
              onChangeText={setPolicyNumber}
              autoCapitalize="characters"
            />

            {savedInsurance ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Use saved policy"
                onPress={() => {
                  setProvider(savedInsurance.provider);
                  setPolicyNumber(savedInsurance.policyNumber);
                  setStep("preview");
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <Card elevation="raised" style={styles.savedCard}>
                  <View style={styles.savedTop}>
                    <AppIcon name="creditCard" size={18} color={colors.ink} />
                    <ThemedText variant="headline" style={styles.savedInsurer}>
                      {savedInsurance.provider}
                    </ThemedText>
                    <AppIcon name="chevronRight" size={15} color={colors.tertiaryLabel} />
                  </View>
                  <ThemedText variant="mono" style={styles.savedPolicy}>
                    {savedInsurance.policyNumber}
                  </ThemedText>
                </Card>
              </Pressable>
            ) : null}

            <Button
              title="Review Coverage"
              size="lg"
              disabled={!provider.trim() || !policyNumber.trim()}
              onPress={() => setStep("preview")}
            />

            <Button
              title="Skip — I'll self-pay"
              variant="ghost"
              size="sm"
              onPress={() => router.push("/(patient)/booking/summary")}
              style={styles.skip}
            />
          </>
        ) : null}

        {step === "preview" ? (
          <>
            <View style={styles.previewCard}>
              <View style={styles.previewTop}>
                <AppIcon name="creditCard" size={20} color={colors.onInk} />
                <ThemedText variant="headline" style={styles.previewInsurer}>
                  {provider || "Denplan"}
                </ThemedText>
              </View>
              <ThemedText variant="mono" style={styles.previewPolicy}>
                {policyNumber.trim() || "•••• ••••"}
              </ThemedText>
            </View>

            <Card elevation="flat" style={styles.checkCard}>
              <ThemedText variant="overline">Coverage check</ThemedText>
              {["Checkup & X-rays — covered", "Hygiene visit — covered", "Whitening — 15% member discount"].map(
                (line) => (
                  <View key={line} style={styles.checkRow}>
                    <AppIcon name="checkCircle" size={15} color={colors.success} />
                    <ThemedText variant="body" style={styles.checkText}>
                      {line}
                    </ThemedText>
                  </View>
                )
              )}
            </Card>

            <View style={styles.choiceRow}>
              <ChipPill label="Number looks wrong? Retake" onPress={() => setStep("scan")} />
            </View>

            <Button title="Confirm & continue" size="lg" onPress={confirm} />
          </>
        ) : null}

        {step === "confirmed" ? (
          <View style={styles.confirmedBox}>
            <AppIcon name="checkCircle" size={24} color={colors.success} />
            <ThemedText variant="headline" style={styles.confirmedTitle}>
              Insurance verified
            </ThemedText>
            <ThemedText variant="caption" style={styles.muted}>
              Continuing to appointment times…
            </ThemedText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  checkCard: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  checkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  checkText: {
    color: colors.label,
    flex: 1,
  },
  choiceRow: {
    flexDirection: "row",
  },
  confirmedBox: {
    alignItems: "center",
    backgroundColor: colors.successSubtle,
    borderRadius: radius.lg,
    gap: spacing.xxs,
    padding: spacing.xl,
  },
  confirmedTitle: {
    color: colors.success,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xxs,
  },
  muted: {
    color: colors.secondaryLabel,
  },
  previewCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  previewInsurer: {
    color: colors.onInk,
  },
  previewPolicy: {
    color: colors.onInk,
    letterSpacing: 2,
  },
  previewTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  savedCard: {
    gap: spacing.xxs,
    padding: spacing.md,
  },
  savedInsurer: {
    color: colors.label,
    flex: 1,
  },
  savedPolicy: {
    color: colors.label,
    letterSpacing: 1,
  },
  savedTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  scanBox: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderColor: colors.ink,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    borderWidth: 1.5,
    gap: spacing.xxs,
    padding: spacing.xxl,
  },
  scanSub: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  scanTitle: {
    color: colors.ink,
    fontWeight: "700",
  },
  skip: {
    alignSelf: "center",
    marginTop: spacing.xxs,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});
