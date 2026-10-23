import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, ListRow, AppIcon, type AppIconName } from "@/components";
import { colors, spacing } from "@/theme";

// ─── Records — clinical documents hub (routes unchanged) ──────────────────────

interface RecordLink {
  icon: AppIconName;
  title: string;
  subtitle: string;
  route: string;
}

const links: RecordLink[] = [
  {
    icon: "activity",
    title: "Digital Odontogram",
    subtitle: "Interactive 32-tooth dental chart",
    route: "/(patient)/records/odontogram",
  },
  {
    icon: "clipboard",
    title: "Treatment Estimates & Plans",
    subtitle: "Review and approve digital treatment plans",
    route: "/(patient)/records/plans",
  },
  {
    icon: "droplet",
    title: "Prescriptions & Dispensing",
    subtitle: "View electronic pharmacy notes",
    route: "/(patient)/records/prescriptions",
  },
  {
    icon: "image",
    title: "Radiographs & X-Rays",
    subtitle: "Your X-rays and clinical images",
    route: "/(patient)/records/vault",
  },
  {
    icon: "creditCard",
    title: "Payment plans",
    subtitle: "How to spread the cost of treatment",
    route: "/(patient)/records/financing",
  },
  {
    icon: "clock",
    title: "Oral Health Activity & Insights",
    subtitle: "Weekly brushing streaks & recall timer",
    route: "/(patient)/records/insights",
  },
];

export default function PatientRecordsScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary banner */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <AppIcon name="shield" size={20} color={colors.onInk} />
        </View>
        <View style={styles.summaryText}>
          <ThemedText variant="headline" style={styles.summaryTitle}>
            Clinical timeline
          </ThemedText>
          <ThemedText variant="caption" style={styles.summarySub}>
            Your examinations, prescriptions and X-rays from van, video and practice visits.
          </ThemedText>
        </View>
      </Card>

      <View style={styles.section}>
        <ThemedText variant="overline">Documents & plans</ThemedText>
        <Card padding="none">
          {links.map((link, i) => (
            <ListRow
              key={link.title}
              title={link.title}
              subtitle={link.subtitle}
              left={
                <View style={styles.rowIcon}>
                  <AppIcon name={link.icon} size={18} color={colors.ink} />
                </View>
              }
              right={<AppIcon name="chevronRight" size={16} color={colors.tertiaryLabel} />}
              onPress={() => router.push(link.route as never)}
              separator={i < links.length - 1}
            />
          ))}
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
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  section: {
    gap: spacing.xs,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: colors.ink,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: colors.inkSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  summarySub: {
    color: colors.alwaysWhite,
    opacity: 0.75,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    color: colors.alwaysWhite,
  },
});
