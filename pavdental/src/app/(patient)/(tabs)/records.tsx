import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, ListRow } from "@/components";
import { colors, spacing } from "@/theme";

export default function PatientRecordsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summaryCard}>
        <ThemedText variant="headline" style={styles.summaryTitle}>
          Clinical Timeline
        </ThemedText>
        <ThemedText variant="caption" style={styles.summarySub}>
          Full encrypted history of examinations, prescriptions, and digital X-rays across Van, Video & Practice.
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText variant="headline" style={styles.sectionHeader}>
          Documents & Plans
        </ThemedText>
        <Card padding="none">
          <ListRow
            title="Digital Odontogram"
            subtitle="Interactive 32-tooth dental chart"
            left={<ThemedText>🦷</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/records/odontogram" as any)}
            separator
          />
          <ListRow
            title="Treatment Estimates & Plans"
            subtitle="1 active estimate pending approval"
            left={<ThemedText>📋</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/records/plans" as any)}
            separator
          />
          <ListRow
            title="Prescriptions & Dispensing"
            subtitle="View electronic pharmacy notes"
            left={<ThemedText>💊</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/records/vault" as any)}
            separator
          />
          <ListRow
            title="Radiographs & X-Rays"
            subtitle="Encrypted image vault (DICOM)"
            left={<ThemedText>🩻</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/records/vault" as any)}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionHeader: {
    color: colors.label,
  },
  summaryCard: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    gap: spacing.xxs,
    padding: spacing.md,
  },
  summarySub: {
    color: colors.secondaryLabel,
  },
  summaryTitle: {
    color: colors.label,
  },
});

