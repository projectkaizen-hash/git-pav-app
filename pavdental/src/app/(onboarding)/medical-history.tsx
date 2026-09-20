import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button } from "@/components";
import { colors, spacing } from "@/theme";

export default function OnboardingMedicalHistoryScreen() {
  const router = useRouter();
  const [hasAllergies, setHasAllergies] = useState(false);
  const [allergyDetails, setAllergyDetails] = useState("");
  const [isTakingMeds, setIsTakingMeds] = useState(false);
  const [medDetails, setMedDetails] = useState("");
  const [isBleedingRisk, setIsBleedingRisk] = useState(false);
  const [gpSurgery, setGpSurgery] = useState("");

  const handleNext = () => {
    router.push("/(onboarding)/consents");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ThemedText variant="caption" style={styles.stepBadge}>
              STEP 3 OF 4
            </ThemedText>
            <ThemedText variant="largeTitle" style={styles.title}>
              Medical History
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              Essential clinical questions to keep you safe during dental treatments and anaesthetics.
            </ThemedText>
          </View>

          <View style={styles.form}>
            {/* Allergies */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabelBox}>
                <ThemedText variant="headline">Known Allergies</ThemedText>
                <ThemedText variant="caption" style={styles.switchSub}>
                  e.g. Latex, Penicillin, Anaesthetics
                </ThemedText>
              </View>
              <Switch
                value={hasAllergies}
                onValueChange={setHasAllergies}
                trackColor={{ true: colors.brand, false: colors.separator }}
              />
            </View>

            {hasAllergies ? (
              <Input
                label="Allergy details"
                placeholder="List your allergies"
                value={allergyDetails}
                onChangeText={setAllergyDetails}
              />
            ) : null}

            {/* Medications */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabelBox}>
                <ThemedText variant="headline">Regular Medications</ThemedText>
                <ThemedText variant="caption" style={styles.switchSub}>
                  Prescription or regular over-the-counter
                </ThemedText>
              </View>
              <Switch
                value={isTakingMeds}
                onValueChange={setIsTakingMeds}
                trackColor={{ true: colors.brand, false: colors.separator }}
              />
            </View>

            {isTakingMeds ? (
              <Input
                label="Medication details"
                placeholder="List medications & dosages"
                value={medDetails}
                onChangeText={setMedDetails}
              />
            ) : null}

            {/* Blood thinners / bleeding */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabelBox}>
                <ThemedText variant="headline">Blood Thinners / Bleeding Disorders</ThemedText>
                <ThemedText variant="caption" style={styles.switchSub}>
                  e.g. Warfarin, Apixaban, Clopidogrel
                </ThemedText>
              </View>
              <Switch
                value={isBleedingRisk}
                onValueChange={setIsBleedingRisk}
                trackColor={{ true: colors.brand, false: colors.separator }}
              />
            </View>

            {/* GP Surgery */}
            <Input
              label="GP Surgery / Practice Name"
              placeholder="e.g. High Street Medical Centre"
              value={gpSurgery}
              onChangeText={setGpSurgery}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Continue to Consents"
              size="lg"
              onPress={handleNext}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  form: {
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xxs,
    marginBottom: spacing.xl,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  stepBadge: {
    color: colors.brand,
    fontWeight: "700",
    letterSpacing: 1,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  switchLabelBox: {
    flex: 1,
    gap: spacing.xxs / 2,
    paddingRight: spacing.md,
  },
  switchRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  switchSub: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});

