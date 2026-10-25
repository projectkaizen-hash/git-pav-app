import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ThemedText, Card, ListRow, AppIcon, type AppIconName } from "@/components";
import { colors, spacing, radius } from "@/theme";

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
    title: "Digital odontogram",
    subtitle: "Interactive 32-tooth dental chart",
    route: "/(patient)/records/odontogram",
  },
  {
    icon: "clipboard",
    title: "Treatment estimates & plans",
    subtitle: "Review and approve digital treatment plans",
    route: "/(patient)/records/plans",
  },
  {
    icon: "droplet",
    title: "Prescriptions & dispensing",
    subtitle: "View electronic pharmacy notes",
    route: "/(patient)/records/prescriptions",
  },
  {
    icon: "image",
    title: "Radiographs & x-rays",
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
    title: "Oral health activity & insights",
    subtitle: "Weekly brushing streaks & recall timer",
    route: "/(patient)/records/insights",
  },
];

type RecordsTab = "vault" | "activity" | "estimates";

export default function PatientRecordsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<RecordsTab>("vault");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Neo Financial Underline Segmented Tabs (Screen_337_Charts_Dashboard.png) */}
      <View style={styles.segmentContainer}>
        {[
          { key: "vault", label: "Clinical Vault" },
          { key: "activity", label: "Activity & Recall" },
          { key: "estimates", label: "Estimates" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setActiveTab(tab.key as RecordsTab);
              }}
              style={styles.segmentTab}
            >
              <ThemedText
                variant="subhead"
                style={[
                  styles.segmentTabText,
                  isActive && styles.segmentTabTextActive,
                ]}
              >
                {tab.label}
              </ThemedText>
              {isActive ? <View style={styles.segmentActiveLine} /> : null}
            </Pressable>
          );
        })}
      </View>

      {/* 3-Column Metric Summary Card (Screen_337_Charts_Dashboard.png) */}
      <Card style={styles.metricsCard}>
        <View style={styles.metricColumn}>
          <ThemedText variant="largeTitle" style={styles.metricVal}>
            32
          </ThemedText>
          <ThemedText variant="caption" style={styles.metricLabel}>
            Teeth Tracked
          </ThemedText>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricColumn}>
          <ThemedText variant="largeTitle" style={[styles.metricVal, { color: colors.success }]}>
            0
          </ThemedText>
          <ThemedText variant="caption" style={styles.metricLabel}>
            Active Issues
          </ThemedText>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricColumn}>
          <ThemedText variant="largeTitle" style={styles.metricVal}>
            3M
          </ThemedText>
          <ThemedText variant="caption" style={styles.metricLabel}>
            Next Recall
          </ThemedText>
        </View>
      </Card>

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
        <ThemedText variant="overline" style={styles.sectionOverline}>
          Documents & records
        </ThemedText>
        <Card padding="none" style={styles.groupedCard}>
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
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
  },
  segmentContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
    marginBottom: spacing.xs,
  },
  segmentTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    position: "relative",
  },
  segmentTabText: {
    color: colors.secondaryLabel,
    fontWeight: "500",
    fontSize: 13,
  },
  segmentTabTextActive: {
    color: colors.ink,
    fontWeight: "700",
  },
  segmentActiveLine: {
    position: "absolute",
    bottom: -1,
    left: 10,
    right: 10,
    height: 2.5,
    backgroundColor: colors.ink,
    borderRadius: radius.xs,
  },
  metricsCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  metricColumn: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  metricVal: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.label,
  },
  metricLabel: {
    color: colors.secondaryLabel,
    fontSize: 11,
    fontWeight: "600",
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: colors.separator,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: radius.lg,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  section: {
    gap: spacing.xs,
  },
  sectionOverline: {
    color: colors.secondaryLabel,
    letterSpacing: 0.5,
    marginLeft: spacing.xxs,
  },
  groupedCard: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderColor: colors.separator,
  },
  summaryCard: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    height: 44,
    justifyContent: "center",
    width: 44,
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
