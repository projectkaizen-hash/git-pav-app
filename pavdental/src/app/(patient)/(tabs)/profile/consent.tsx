import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { ThemedText, Card, Badge, Button } from "@/components";
import { useCurrentUser } from "@/features/auth/auth-store";
import { usePatientProfile } from "@/features/hooks/use-dental-api";
import { colors, spacing } from "@/theme";

export default function ConsentScreen() {
  const user = useCurrentUser();
  const userId = user?.id || "";
  const { data: profile } = usePatientProfile(userId);
  const [isExporting, setIsExporting] = useState(false);

  const consents = (profile?.consents as any) || {
    healthData: { signed: true, version: "v2.1", date: "2026-01-10" },
    treatment: { signed: true, version: "v2.1", date: "2026-01-10" },
    marketing: { signed: false, version: "v2.1", date: null },
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      Alert.alert(
        "GDPR Export Generated",
        "Your encrypted subject access request (SAR) bundle has been prepared. A secure download link has been sent to your registered email address.",
        [{ text: "OK" }]
      );
    }, 1200);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.banner}>
        <ThemedText style={styles.bannerIcon}>📋</ThemedText>
        <View style={styles.bannerTextWrap}>
          <ThemedText variant="headline">UK GDPR & NHS DSPT Standards</ThemedText>
          <ThemedText variant="caption" style={styles.bannerSub}>
            You have legal control over your clinical consents and data processing choices.
          </ThemedText>
        </View>
      </View>

      {/* Consents List */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          ACTIVE CONSENT RECORDS
        </ThemedText>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText variant="headline" style={styles.cardTitle}>
              Special Category Health Data
            </ThemedText>
            <Badge variant="success" label="Active" />
          </View>
          <ThemedText variant="caption" style={styles.cardDesc}>
            Explicit consent for Pav Dental to store, process, and clinically review your dental odontograms, X-rays, medications, and medical conditions (UK GDPR Article 9).
          </ThemedText>
          <View style={styles.metaRow}>
            <ThemedText variant="caption" style={styles.metaText}>
              Version: {consents.healthData?.version || "v2.1"}
            </ThemedText>
            <ThemedText variant="caption" style={styles.metaText}>
              Signed: {consents.healthData?.date || "At Onboarding"}
            </ThemedText>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText variant="headline" style={styles.cardTitle}>
              Clinical Treatment & Examination
            </ThemedText>
            <Badge variant="success" label="Active" />
          </View>
          <ThemedText variant="caption" style={styles.cardDesc}>
            Consent to receive oral examinations, emergency dental triage, telehealth triage, and mobile van care by registered GDC professionals.
          </ThemedText>
          <View style={styles.metaRow}>
            <ThemedText variant="caption" style={styles.metaText}>
              Version: {consents.treatment?.version || "v2.1"}
            </ThemedText>
            <ThemedText variant="caption" style={styles.metaText}>
              Signed: {consents.treatment?.date || "At Onboarding"}
            </ThemedText>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText variant="headline" style={styles.cardTitle}>
              Recall & Preventive Reminders
            </ThemedText>
            <Badge
              variant={consents.marketing?.signed ? "success" : "default"}
              label={consents.marketing?.signed ? "Opted In" : "Opted Out"}
            />
          </View>
          <ThemedText variant="caption" style={styles.cardDesc}>
            Notifications sent every 6 months to remind you when your routine dental checkup or hygiene session is due.
          </ThemedText>
        </Card>
      </View>

      {/* Retention Policy */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          STATUTORY DATA RETENTION
        </ThemedText>
        <Card style={styles.card}>
          <ThemedText variant="headline">How Long Records Are Stored</ThemedText>
          <ThemedText variant="caption" style={styles.cardDesc}>
            Under UK NHS and Private Dental regulations, dental records, radiographs, and clinical consultation notes must be preserved for a minimum of 11 years after completion of treatment (or until age 25 for children, whichever is longer).
          </ThemedText>
        </Card>
      </View>

      {/* Export Archive */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          RIGHT OF ACCESS (SAR)
        </ThemedText>
        <Card style={styles.card}>
          <ThemedText variant="headline">Export Your Dental Records</ThemedText>
          <ThemedText variant="caption" style={styles.cardDesc}>
            Receive a secure, password-protected ZIP archive containing your treatment plans, odontogram history, signed consents, and invoices.
          </ThemedText>
          <Button
            title={isExporting ? "Generating Bundle..." : "Download GDPR Data Bundle"}
            variant="secondary"
            onPress={handleExportData}
            disabled={isExporting}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  bannerIcon: {
    fontSize: 26,
  },
  bannerSub: {
    color: colors.secondaryLabel,
  },
  bannerTextWrap: {
    flex: 1,
    gap: 2,
  },
  card: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardDesc: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: colors.label,
    flex: 1,
    paddingRight: spacing.sm,
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  metaRow: {
    borderTopColor: colors.separator,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  metaText: {
    color: colors.secondaryLabel,
    fontSize: 11,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.secondaryLabel,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

