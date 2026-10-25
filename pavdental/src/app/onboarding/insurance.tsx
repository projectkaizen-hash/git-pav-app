import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ThemedText, Input, Button, ProgressPills, AppIcon, ChipPill, IconButton } from "@/components";
import { colors, spacing } from "@/theme";
import { useOnboardingStore } from "@/features/onboarding/onboarding-store";

const INSURERS = ["Denplan", "Bupa Dental", "AXA Health", "Simplyhealth", "Other"];

export default function OnboardingInsuranceScreen() {
  const router = useRouter();
  const savedInsurance = useOnboardingStore((s) => s.insurance);
  const setInsurance = useOnboardingStore((s) => s.setInsurance);

  const [hasInsurance, setHasInsurance] = useState<boolean | null>(
    savedInsurance ? true : null
  );
  const [insurer, setInsurer] = useState<string | null>(
    savedInsurance?.provider || null
  );
  const [customProvider, setCustomProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState(
    savedInsurance?.policyNumber || ""
  );
  const [scanState, setScanState] = useState<"idle" | "scanning" | "captured">("idle");

  const startScan = async () => {
    setScanState("scanning");
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setScanState("captured");
        return;
      }
    } catch {
      // Picker unavailable
    }
    setScanState("idle");
  };

  const handleContinue = () => {
    if (hasInsurance === true && insurer) {
      const resolvedProvider =
        insurer === "Other" && customProvider.trim()
          ? customProvider.trim()
          : insurer;
      setInsurance({
        provider: resolvedProvider,
        policyNumber: policyNumber.trim(),
      });
    } else if (hasInsurance === false) {
      setInsurance(null);
    }
    router.push("/onboarding/medical-history");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topNav}>
        <IconButton
          icon="chevronLeft"
          label="Go back"
          variant="soft"
          size={18}
          onPress={() => router.back()}
        />
        <View style={styles.progressWrap}>
          <ProgressPills total={5} current={3} />
        </View>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Dental Insurance
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Optional — add a policy to speed up claims and check what's covered before you book.
          </ThemedText>
        </View>

        {/* Yes / no choice */}
        <View style={styles.choiceRow}>
          <ChipPill
            label="I have insurance"
            selected={hasInsurance === true}
            onPress={() => setHasInsurance(true)}
          />
          <ChipPill
            label="No insurance"
            selected={hasInsurance === false}
            onPress={() => setHasInsurance(false)}
          />
        </View>

        {hasInsurance === true ? (
          <View style={styles.section}>
            <ThemedText variant="overline" style={styles.sectionOverline}>PROVIDER</ThemedText>
            <View style={styles.choiceRow}>
              {INSURERS.map((name) => (
                <ChipPill
                  key={name}
                  label={name}
                  selected={insurer === name}
                  onPress={() => setInsurer(name)}
                />
              ))}
            </View>

            {insurer ? (
              <>
                {insurer === "Other" ? (
                  <Input
                    label="Insurance Provider Name"
                    placeholder="e.g. Vitality Health"
                    value={customProvider}
                    onChangeText={setCustomProvider}
                  />
                ) : null}

                {/* Card scan zone */}
                <ThemedText variant="overline" style={styles.sectionOverline}>POLICY CARD</ThemedText>
                {scanState === "captured" ? (
                  <View style={styles.previewCard}>
                    <View style={styles.previewTop}>
                      <AppIcon name="creditCard" size={20} color={colors.alwaysWhite} />
                      <ThemedText variant="headline" style={styles.previewInsurer}>
                        {insurer}
                      </ThemedText>
                    </View>
                    <ThemedText variant="mono" style={styles.previewPolicy}>
                      {policyNumber.trim() || "DP •••• ••••"}
                    </ThemedText>
                    <View style={styles.previewRow}>
                      <AppIcon name="checkCircle" size={14} color={colors.success} />
                      <ThemedText variant="caption" style={styles.previewOk}>
                        Card captured — check the number below
                      </ThemedText>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Scan insurance card"
                    accessibilityState={{ busy: scanState === "scanning" }}
                    onPress={startScan}
                    style={({ pressed }) => [styles.scanBox, pressed && { opacity: 0.85 }]}
                  >
                    <View style={styles.scanIconCircle}>
                      <AppIcon
                        name={scanState === "scanning" ? "refresh" : "camera"}
                        size={22}
                        color={colors.ink}
                      />
                    </View>
                    <ThemedText variant="subhead" style={styles.scanTitle}>
                      {scanState === "scanning" ? "Scanning card…" : "Scan your policy card"}
                    </ThemedText>
                    <ThemedText variant="caption" style={styles.scanSub}>
                      Fit the card inside the frame — we read the policy number automatically.
                    </ThemedText>
                  </Pressable>
                )}

                <Input
                  label="Policy number"
                  placeholder="e.g. DP-4471-8820"
                  value={policyNumber}
                  onChangeText={setPolicyNumber}
                  autoCapitalize="characters"
                />
              </>
            ) : null}
          </View>
        ) : null}

        {hasInsurance === false ? (
          <View style={styles.noteBox}>
            <AppIcon name="info" size={16} color={colors.secondaryLabel} />
            <ThemedText variant="caption" style={styles.noteText}>
              No problem — you can self-pay per visit. Add a policy any time from Profile → Insurance.
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={hasInsurance === true ? "Save & Continue" : "Continue to Medical History"}
            size="lg"
            arrow={true}
            disabled={hasInsurance === null}
            onPress={handleContinue}
          />
          <Button
            title="Skip for now"
            variant="ghost"
            size="sm"
            onPress={() => router.push("/onboarding/medical-history")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingTop: spacing.sm,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
  },
  navSpacer: {
    width: 44,
  },
  noteBox: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.separator,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.md,
  },
  noteText: {
    color: colors.secondaryLabel,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: colors.ink,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md + 2,
  },
  previewInsurer: {
    color: colors.alwaysWhite,
    fontWeight: "700",
  },
  previewOk: {
    color: colors.alwaysWhite,
    opacity: 0.85,
  },
  previewPolicy: {
    color: colors.alwaysWhite,
    letterSpacing: 2,
    fontSize: 16,
    fontWeight: "600",
  },
  previewRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  previewTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  progressWrap: {
    alignItems: "center",
    flex: 1,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  scanBox: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.xl,
  },
  scanIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.systemBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxs,
  },
  scanSub: {
    color: colors.secondaryLabel,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
    maxWidth: 260,
  },
  scanTitle: {
    color: colors.label,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  sectionOverline: {
    color: colors.secondaryLabel,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  subtitle: {
    color: colors.secondaryLabel,
    fontSize: 15,
    lineHeight: 21,
  },
  title: {
    color: colors.label,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  topNav: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
