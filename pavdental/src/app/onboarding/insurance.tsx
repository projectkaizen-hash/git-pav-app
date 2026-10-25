import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ThemedText, Input, Button, ProgressPills, AppIcon, ChipPill } from "@/components";
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ProgressPills total={5} current={3} />
          <ThemedText variant="largeTitle" style={styles.title}>
            Dental insurance
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
            <ThemedText variant="overline">Provider</ThemedText>
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
                <ThemedText variant="overline">Policy card</ThemedText>
                {scanState === "captured" ? (
                  <View style={styles.previewCard}>
                    <View style={styles.previewTop}>
                      <AppIcon name="creditCard" size={20} color={colors.ink} />
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
                    <AppIcon
                      name={scanState === "scanning" ? "refresh" : "camera"}
                      size={26}
                      color={colors.ink}
                    />
                    <ThemedText variant="subhead" style={styles.scanTitle}>
                      {scanState === "scanning" ? "Scanning card…" : "Scan your card"}
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
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  header: {
    gap: spacing.xxs,
    marginBottom: spacing.xl,
  },
  noteBox: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.md,
  },
  noteText: {
    color: colors.secondaryLabel,
    flex: 1,
  },
  previewCard: {
    backgroundColor: colors.ink,
    borderRadius: 14,
    gap: spacing.xs,
    padding: spacing.md,
  },
  previewInsurer: {
    color: colors.onInk,
  },
  previewOk: {
    color: colors.onInk,
    opacity: 0.8,
  },
  previewPolicy: {
    color: colors.onInk,
    letterSpacing: 2,
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
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  scanBox: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.ink,
    borderStyle: "dashed",
    borderRadius: 14,
    borderWidth: 1.5,
    gap: spacing.xxs,
    padding: spacing.xl,
  },
  scanSub: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  scanTitle: {
    color: colors.ink,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});
