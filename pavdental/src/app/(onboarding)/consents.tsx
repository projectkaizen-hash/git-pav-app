import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Button } from "@/components";
import { colors, spacing } from "@/theme";

export default function OnboardingConsentsScreen() {
  const router = useRouter();
  const [dataProcessing, setDataProcessing] = useState(false);
  const [treatmentConsent, setTreatmentConsent] = useState(false);
  const [directMarketing, setDirectMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleComplete = () => {
    if (!dataProcessing || !treatmentConsent) {
      setError("Please accept the mandatory health data & clinical treatment consents to continue.");
      return;
    }

    router.push("/(onboarding)/complete");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText variant="caption" style={styles.stepBadge}>
            STEP 4 OF 4
          </ThemedText>
          <ThemedText variant="largeTitle" style={styles.title}>
            Privacy & Consents
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            We adhere strictly to UK GDPR and NHS Data Security & Protection standards (DSPT).
          </ThemedText>
        </View>

        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <ThemedText variant="caption" style={styles.errorText}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.consentList}>
          {/* Mandatory Health Data */}
          <View style={styles.consentCard}>
            <View style={styles.cardHeader}>
              <ThemedText variant="headline" style={styles.cardTitle}>
                Special Category Health Data (Mandatory)
              </ThemedText>
              <Switch
                value={dataProcessing}
                onValueChange={(val) => {
                  setDataProcessing(val);
                  if (error) setError(null);
                }}
                trackColor={{ true: colors.brand, false: colors.separator }}
              />
            </View>
            <ThemedText variant="subhead" style={styles.cardBody}>
              I consent to Pav Dental storing and processing my sensitive medical and dental history to provide clinical triage, examinations, and healthcare.
            </ThemedText>
          </View>

          {/* Mandatory Clinical Examination */}
          <View style={styles.consentCard}>
            <View style={styles.cardHeader}>
              <ThemedText variant="headline" style={styles.cardTitle}>
                General Treatment & Examination (Mandatory)
              </ThemedText>
              <Switch
                value={treatmentConsent}
                onValueChange={(val) => {
                  setTreatmentConsent(val);
                  if (error) setError(null);
                }}
                trackColor={{ true: colors.brand, false: colors.separator }}
              />
            </View>
            <ThemedText variant="subhead" style={styles.cardBody}>
              I understand that examinations, X-rays, video consultations, and emergency triage may be conducted by registered GDC practitioners.
            </ThemedText>
          </View>

          {/* Optional Communication */}
          <View style={styles.consentCard}>
            <View style={styles.cardHeader}>
              <ThemedText variant="headline" style={styles.cardTitle}>
                Hygiene & Recall Reminders (Optional)
              </ThemedText>
              <Switch
                value={directMarketing}
                onValueChange={setDirectMarketing}
                trackColor={{ true: colors.brand, false: colors.separator }}
              />
            </View>
            <ThemedText variant="subhead" style={styles.cardBody}>
              Receive SMS and email reminders when your routine 6-month checkup or hygiene session is due.
            </ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Complete Registration"
            size="lg"
            onPress={handleComplete}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: spacing.xl,
  },
  cardBody: {
    color: colors.secondaryLabel,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  consentCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    gap: spacing.xs,
    padding: spacing.md,
  },
  consentList: {
    gap: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.dangerSubtle,
    borderRadius: 8,
    marginBottom: spacing.md,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  header: {
    gap: spacing.xxs,
    marginBottom: spacing.lg,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  scrollContent: {
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
  title: {
    color: colors.label,
  },
});

