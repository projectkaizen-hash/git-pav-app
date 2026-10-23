import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button, AppIcon, Badge } from "@/components";
import { colors, spacing, radius } from "@/theme";
import { useOralHealthInsights } from "@/features/hooks/use-dental-api";

export default function OralHealthInsightsScreen() {
  const router = useRouter();
  const { data: insightsData } = useOralHealthInsights();

  const defaultWeeklyData = [
    { day: "Mon", am: true, pm: true, durationSec: 245 },
    { day: "Tue", am: true, pm: true, durationSec: 250 },
    { day: "Wed", am: true, pm: true, durationSec: 240 },
    { day: "Thu", am: true, pm: true, durationSec: 260 },
    { day: "Fri", am: true, pm: true, durationSec: 240 },
    { day: "Sat", am: true, pm: true, durationSec: 240 },
    { day: "Sun", am: true, pm: false, durationSec: 120 },
  ];

  const weeklyData = Array.isArray(insightsData?.weeklyBrushing) && insightsData.weeklyBrushing.length > 0
    ? insightsData.weeklyBrushing.map((m: any) => ({
        day: m.day || m.dayLabel || "Day",
        am: Boolean(m.am ?? m.brushedMorning),
        pm: Boolean(m.pm ?? m.brushedEvening),
        durationSec: Number(m.durationSec || 240),
      }))
    : defaultWeeklyData;

  const plaqueIndex = insightsData?.plaqueIndexPercent ?? insightsData?.summary?.plaqueIndex ?? 12;
  const bleedingIndex = insightsData?.bleedingPercent ?? insightsData?.summary?.bleedingIndex ?? 4;
  const adherenceRate = insightsData?.summary?.adherencePercent ?? 93;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Oral Health Insights
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Continuous plaque control analytics and hygiene recall progression.
          </ThemedText>
        </View>

        {/* Recall Countdown Hero (Neo Financial Style) */}
        <Card elevation="raised" style={styles.recallCard}>
          <View style={styles.recallTop}>
            <View>
              <ThemedText variant="caption" style={styles.recallSub}>PREVENTIVE RECALL CYCLE</ThemedText>
              <ThemedText variant="largeTitle" style={styles.recallDays}>
                42 Days
              </ThemedText>
              <ThemedText variant="caption" style={styles.recallTarget}>
                Until Next 6-Month Scale & Polish
              </ThemedText>
            </View>
            <Badge label="OPTIMAL TRACK" variant="success" />
          </View>

          <View style={styles.divider} />

          <View style={styles.recallBottom}>
            <ThemedText variant="caption" style={styles.recallClinic}>
              Nominated: Pav Dental Central Practice · Elena Rostova (RDH)
            </ThemedText>
            <Button
              title="Book Early ›"
              variant="secondary"
              size="sm"
              onPress={() => router.push("/(patient)/booking/service-catalog" as any)}
            />
          </View>
        </Card>

        {/* Weekly AM / PM Brushing Bar Chart */}
        <Card elevation="raised" style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <ThemedText variant="headline">Weekly Brushing Adherence</ThemedText>
            <Badge label={`${adherenceRate}% Goal Met`} variant="info" />
          </View>
          <ThemedText variant="caption" style={styles.muted}>
            2 sessions daily (AM + PM, 2 mins each). Goal: 4 mins/day.
          </ThemedText>

          {/* Bar Columns */}
          <View style={styles.barsContainer}>
            {weeklyData.map((item: { day: string; am: boolean; pm: boolean; durationSec: number }) => {
              const heightPercent = Math.min(100, (item.durationSec / 240) * 100);
              const isGoalMet = item.am && item.pm;
              return (
                <View key={item.day} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPercent}%` },
                        !isGoalMet && styles.barFillPartial,
                      ]}
                    />
                  </View>
                  <ThemedText variant="caption" style={styles.dayLabel}>
                    {item.day}
                  </ThemedText>
                  <View style={styles.amPmDots}>
                    <View style={[styles.dot, item.am && styles.dotActive]} />
                    <View style={[styles.dot, item.pm && styles.dotActive]} />
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotActive]} />
              <ThemedText variant="caption" style={styles.legendText}>Completed (2 mins)</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, styles.dotMissing]} />
              <ThemedText variant="caption" style={styles.legendText}>Missed session</ThemedText>
            </View>
          </View>
        </Card>

        {/* Clinical Health Gauges */}
        <View style={styles.gaugesGrid}>
          <Card elevation="raised" style={styles.gaugeCard}>
            <ThemedText variant="caption" style={styles.gaugeSub}>PLAQUE INDEX</ThemedText>
            <ThemedText variant="largeTitle" style={styles.gaugeNum}>{plaqueIndex}%</ThemedText>
            <ThemedText variant="caption" style={styles.gaugeStatusGood}>
              ✓ Target &lt; 15% (Low Risk)
            </ThemedText>
          </Card>

          <Card elevation="raised" style={styles.gaugeCard}>
            <ThemedText variant="caption" style={styles.gaugeSub}>BLEEDING ON PROBE</ThemedText>
            <ThemedText variant="largeTitle" style={styles.gaugeNum}>{bleedingIndex}%</ThemedText>
            <ThemedText variant="caption" style={styles.gaugeStatusGood}>
              ✓ Healthy Gingiva
            </ThemedText>
          </Card>
        </View>

        {/* Clinician Advice Card */}
        <Card style={styles.adviceCard}>
          <View style={styles.adviceHeaderRow}>
            <AppIcon name="userCheck" size={18} color={colors.ink} />
            <ThemedText variant="headline">Practitioner Advice</ThemedText>
          </View>
          <ThemedText variant="caption" style={styles.adviceAuthor}>
            Logged by Dr. Tariq Pav after 24 Sep Examination:
          </ThemedText>
          <ThemedText variant="body" style={styles.adviceBody}>
            "Focus gentle circular motions on the distal aspect of Tooth #31 (LR7) to prevent early enamel demineralisation from progressing into the dentine. Continue daily interdental brushing."
          </ThemedText>
        </Card>

        {/* Smart Toothbrush & Apple Health Sync */}
        <Card style={styles.syncCard}>
          <View style={styles.syncRow}>
            <AppIcon name="smartphone" size={20} color={colors.ink} />
            <View style={styles.syncTextGroup}>
              <ThemedText variant="headline">Apple Health & Smart Brush</ThemedText>
              <ThemedText variant="caption" style={styles.muted}>
                Philips Sonicare connected · Synced 2 hours ago
              </ThemedText>
            </View>
            <Badge label="CONNECTED" variant="success" />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  adviceAuthor: {
    color: colors.secondaryLabel,
    marginTop: 2,
  },
  adviceBody: {
    color: colors.label,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  adviceCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  adviceHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  amPmDots: {
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
  },
  barCol: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  barFill: {
    backgroundColor: colors.ink,
    borderRadius: 6,
    width: "100%",
  },
  barFillPartial: {
    backgroundColor: colors.warning,
  },
  barTrack: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 6,
    height: 120,
    justifyContent: "flex-end",
    overflow: "hidden",
    width: 24,
  },
  barsContainer: {
    alignItems: "flex-end",
    flexDirection: "row",
    height: 150,
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  chartCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  chartHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chartLegend: {
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  dayLabel: {
    color: colors.secondaryLabel,
    fontWeight: "600",
  },
  divider: {
    backgroundColor: colors.separator,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  dot: {
    backgroundColor: colors.separator,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: colors.success,
  },
  dotMissing: {
    backgroundColor: colors.secondaryBackground,
  },
  gaugeCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: spacing.md,
  },
  gaugeNum: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
  },
  gaugeStatusGood: {
    color: colors.success,
    fontWeight: "600",
  },
  gaugeSub: {
    color: colors.secondaryLabel,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  gaugesGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  header: {
    gap: spacing.xxs,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  legendText: {
    color: colors.secondaryLabel,
  },
  muted: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  recallBottom: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  recallCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  recallClinic: {
    color: colors.secondaryLabel,
    flex: 1,
    paddingRight: spacing.sm,
  },
  recallDays: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -1,
  },
  recallSub: {
    color: colors.secondaryLabel,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  recallTarget: {
    color: colors.secondaryLabel,
  },
  recallTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 20,
  },
  syncCard: {
    backgroundColor: colors.secondaryBackground,
    borderCurve: "continuous",
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  syncRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  syncTextGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.label,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
});
