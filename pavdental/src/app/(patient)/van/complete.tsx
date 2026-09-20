import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button } from "@/components";
import { colors, spacing } from "@/theme";

export default function VanCompleteScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.centerHeader}>
            <View style={styles.checkCircle}>
              <ThemedText variant="largeTitle">🦷</ThemedText>
            </View>
            <ThemedText variant="largeTitle" style={styles.title}>
              Van Visit Complete!
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              Thank you for trusting Pav Dental. Your driveway clinical visit has finished and your digital records are updated.
            </ThemedText>
          </View>

          {/* Treatment Performed Card */}
          <Card elevation="raised" style={styles.card}>
            <ThemedText variant="headline" style={styles.cardTitle}>
              Procedures Completed On Board
            </ThemedText>
            <View style={styles.treatmentRow}>
              <ThemedText variant="body">• Dental Examination & Gum Check</ThemedText>
              <ThemedText variant="caption" style={styles.okTag}>Done</ThemedText>
            </View>
            <View style={styles.treatmentRow}>
              <ThemedText variant="body">• 2 Digital Low-Dose Bitewings</ThemedText>
              <ThemedText variant="caption" style={styles.okTag}>Done</ThemedText>
            </View>
            <View style={styles.treatmentRow}>
              <ThemedText variant="body">• AirFlow Hygiene & Stain Removal</ThemedText>
              <ThemedText variant="caption" style={styles.okTag}>Done</ThemedText>
            </View>
          </Card>

          {/* Digital Vault Notice */}
          <Card elevation="raised" style={styles.card}>
            <ThemedText variant="headline" style={styles.cardTitle}>
              Post-Care & Records
            </ThemedText>
            <ThemedText variant="caption" style={styles.sub}>
              Your dental radiographs and odontogram chart are now available in your encrypted Records tab. A full VAT invoice has been sent to your email.
            </ThemedText>
          </Card>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="View Updated Dental Records"
            size="lg"
            onPress={() => router.replace("/(patient)/(tabs)/records")}
          />
          <Button
            title="Back to Home"
            variant="ghost"
            size="md"
            onPress={() => router.replace("/(patient)/(tabs)/home")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.label,
    marginBottom: spacing.xxs,
  },
  centerHeader: {
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  checkCircle: {
    alignItems: "center",
    backgroundColor: colors.brandSubtle,
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 80,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  footer: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  okTag: {
    color: colors.success,
    fontWeight: "700",
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  sub: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
  title: {
    color: colors.label,
    textAlign: "center",
  },
  treatmentRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
});

