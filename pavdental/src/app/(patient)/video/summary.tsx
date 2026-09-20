import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button, Badge } from "@/components";
import { colors, spacing } from "@/theme";

export default function VideoSummaryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.checkBadge}>
              <ThemedText variant="headline">✓ Completed</ThemedText>
            </View>
            <ThemedText variant="largeTitle" style={styles.title}>
              Consultation Summary
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              Conducted by Dr. Tariq Pav on Friday 19 Sep at 14:15.
            </ThemedText>
          </View>

          {/* Clinical Findings Card */}
          <Card elevation="raised" style={styles.card}>
            <ThemedText variant="headline" style={styles.cardHeader}>
              Clinical Assessment & Findings
            </ThemedText>
            <ThemedText variant="body" style={styles.findingText}>
              Suspected reversible pulpitis on lower right second molar (LR7). Deep occlusal caries detected on intraoral photographs. No acute spreading cellulitis or airway compromise noted.
            </ThemedText>
          </Card>

          {/* Electronic Prescription */}
          <Card elevation="raised" style={styles.card}>
            <View style={styles.rowBetween}>
              <ThemedText variant="headline" style={styles.cardHeader}>
                Electronic Prescription Issued
              </ThemedText>
              <Badge label="Sent to Pharmacy" variant="success" />
            </View>
            <View style={styles.rxItem}>
              <ThemedText variant="headline" style={styles.rxName}>
                Amoxicillin 500mg Capsules
              </ThemedText>
              <ThemedText variant="caption" style={styles.rxDosage}>
                Take 1 capsule three times daily for 5 days.
              </ThemedText>
            </View>
            <ThemedText variant="caption" style={styles.rxFooter}>
              Dispatched electronically to Boots Pharmacy (Harley St branch).
            </ThemedText>
          </Card>

          {/* Recommended Next Action */}
          <Card elevation="raised" style={styles.actionCard}>
            <ThemedText variant="headline" style={styles.actionTitle}>
              Recommended Next Step
            </ThemedText>
            <ThemedText variant="subhead" style={styles.actionBody}>
              Book a Mobile Van or Clinic visit within 7 days for restorative filling before symptoms worsen.
            </ThemedText>
            <View style={styles.ctaRow}>
              <Button
                title="Book Van to My Home"
                size="md"
                onPress={() => router.replace("/(patient)/van/service-area" as any)}
              />
              <Button
                title="Book Clinic Visit"
                variant="secondary"
                size="md"
                onPress={() => router.replace("/(patient)/booking/service-catalog" as any)}
              />
            </View>
          </Card>
        </ScrollView>

        {/* Bottom Bar */}
        <View style={styles.footer}>
          <Button
            title="Return to Home Dashboard"
            variant="ghost"
            size="lg"
            onPress={() => router.replace("/(patient)/(tabs)/home")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionBody: {
    color: colors.label,
    lineHeight: 20,
  },
  actionCard: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  actionTitle: {
    color: colors.brand,
  },
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardHeader: {
    color: colors.label,
  },
  checkBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.successSubtle,
    borderRadius: 8,
    marginBottom: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  ctaRow: {
    flexDirection: "column",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  findingText: {
    color: colors.secondaryLabel,
    lineHeight: 22,
  },
  footer: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  header: {
    gap: spacing.xxs,
    marginTop: spacing.sm,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rxDosage: {
    color: colors.secondaryLabel,
  },
  rxFooter: {
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  rxItem: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    gap: 2,
    marginTop: spacing.xxs,
    padding: spacing.sm,
  },
  rxName: {
    color: colors.label,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});

