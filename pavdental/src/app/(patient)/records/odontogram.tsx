import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { ThemedText, Card, Badge, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { mockOdontogram } from "@/features/records/records-mock-data";
import { ToothRecord, ToothCondition } from "@/features/records/records-types";

import { useOdontogram } from "@/features/hooks/use-dental-api";

import { useCurrentUser } from "@/features/auth/auth-store";

export default function OdontogramScreen() {
  const user = useCurrentUser();
  const userId = user?.id || "00000000-0000-0000-0000-000000000000";
  const { data: apiTeeth } = useOdontogram(userId);
  const teeth = (apiTeeth && apiTeeth.length > 0) ? (apiTeeth as ToothRecord[]) : mockOdontogram;

  const [selectedTooth, setSelectedTooth] = useState<ToothRecord>(teeth[0] || mockOdontogram[0]);

  const upperTeeth = teeth.filter((t) => t.arch === "upper");
  const lowerTeeth = teeth.filter((t) => t.arch === "lower");

  const getConditionBadgeVariant = (cond: ToothCondition): any => {
    switch (cond) {
      case "healthy":
        return "success";
      case "decay":
        return "danger";
      case "filled":
        return "default";
      case "crown":
      case "implant":
        return "info";
      default:
        return "warning";
    }
  };

  const getToothColor = (cond: ToothCondition): any => {
    switch (cond) {
      case "healthy":
        return "#E2E8F0"; // Clean enamel
      case "decay":
        return colors.dangerSubtle;
      case "filled":
        return colors.infoSubtle;
      case "crown":
        return "#FEF3C7"; // Gold/zirconia tint
      case "missing":
        return "transparent";
      default:
        return colors.secondaryBackground;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="headline" style={styles.title}>
            Interactive Dental Odontogram
          </ThemedText>
          <ThemedText variant="caption" style={styles.subtitle}>
            Tap any tooth to inspect restorations, cavities, crowns, or clinical notes.
          </ThemedText>
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: "#CBD5E1" }]} />
            <ThemedText variant="caption">Healthy</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <ThemedText variant="caption">Needs Care</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.info }]} />
            <ThemedText variant="caption">Filled</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.warning }]} />
            <ThemedText variant="caption">Crown</ThemedText>
          </View>
        </View>

        {/* Upper Dental Arch */}
        <View style={styles.archBox}>
          <ThemedText variant="caption" style={styles.archLabel}>
            UPPER ARCH (MAXILLARY)
          </ThemedText>
          <View style={styles.teethRow}>
            {upperTeeth.map((t) => {
              const isSelected = selectedTooth.number === t.number;
              return (
                <Pressable
                  key={t.number}
                  onPress={() => setSelectedTooth(t)}
                  style={[
                    styles.toothPill,
                    { backgroundColor: getToothColor(t.condition) },
                    isSelected && styles.toothPillSelected,
                  ]}
                >
                  <ThemedText variant="caption" style={styles.toothNum}>
                    {t.number}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Lower Dental Arch */}
        <View style={styles.archBox}>
          <ThemedText variant="caption" style={styles.archLabel}>
            LOWER ARCH (MANDIBULAR)
          </ThemedText>
          <View style={styles.teethRow}>
            {lowerTeeth.map((t) => {
              const isSelected = selectedTooth.number === t.number;
              return (
                <Pressable
                  key={t.number}
                  onPress={() => setSelectedTooth(t)}
                  style={[
                    styles.toothPill,
                    { backgroundColor: getToothColor(t.condition) },
                    isSelected && styles.toothPillSelected,
                  ]}
                >
                  <ThemedText variant="caption" style={styles.toothNum}>
                    {t.number}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Selected Tooth Inspector Card */}
        {selectedTooth ? (
          <Card elevation="raised" style={styles.inspectorCard}>
            <View style={styles.inspectorTop}>
              <View style={styles.toothTitleGroup}>
                <ThemedText variant="headline" style={styles.toothName}>
                  Tooth #{selectedTooth.number}
                </ThemedText>
                <ThemedText variant="caption" style={styles.toothSub}>
                  {selectedTooth.name} ({selectedTooth.quadrant} Quadrant)
                </ThemedText>
              </View>
              <Badge
                label={selectedTooth.condition.toUpperCase()}
                variant={getConditionBadgeVariant(selectedTooth.condition)}
              />
            </View>

            <View style={styles.notesBox}>
              <ThemedText variant="caption" style={styles.notesLabel}>
                Clinical Observation:
              </ThemedText>
              <ThemedText variant="body" style={styles.notesBody}>
                {selectedTooth.notes || "No active pathology detected. Enamel & pulp test vital."}
              </ThemedText>
            </View>

            {selectedTooth.condition === "decay" ? (
              <Button
                title="Book Restorative Filling for This Tooth"
                size="sm"
                onPress={() => {}}
              />
            ) : null}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  archBox: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 16,
    gap: spacing.xs,
    padding: spacing.md,
  },
  archLabel: {
    color: colors.secondaryLabel,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
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
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  header: {
    gap: spacing.xxs,
  },
  inspectorCard: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
    padding: spacing.md,
  },
  inspectorTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  legendRow: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-around",
    padding: spacing.sm,
  },
  notesBody: {
    color: colors.label,
  },
  notesBox: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    gap: 2,
    padding: spacing.sm,
  },
  notesLabel: {
    color: colors.secondaryLabel,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  teethRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: spacing.xxs,
  },
  title: {
    color: colors.label,
  },
  toothName: {
    color: colors.label,
  },
  toothNum: {
    color: colors.label,
    fontSize: 11,
    fontWeight: "700",
  },
  toothPill: {
    alignItems: "center",
    borderColor: colors.separator,
    borderRadius: 8,
    borderWidth: 1.5,
    height: 44,
    justifyContent: "center",
    width: 34,
  },
  toothPillSelected: {
    borderColor: colors.brand,
    borderWidth: 2.5,
    transform: [{ scale: 1.08 }],
  },
  toothSub: {
    color: colors.secondaryLabel,
  },
  toothTitleGroup: {
    gap: 2,
  },
});
