import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { ThemedText, Card, Badge, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { ToothRecord, ToothCondition } from "@/features/records/records-types";

import { useOdontogram } from "@/features/hooks/use-dental-api";

import { useCurrentUser } from "@/features/auth/auth-store";

export default function OdontogramScreen() {
  const user = useCurrentUser();
  const userId = user?.id;
  const { data: apiTeeth, isLoading, isError } = useOdontogram(userId || "");
  const teeth = (apiTeeth && apiTeeth.length > 0) ? (apiTeeth as ToothRecord[]) : [];

  const [selectedTooth, setSelectedTooth] = useState<ToothRecord | null>(teeth[0] || null);

  // Group teeth by arch based on quadrant
  const upperTeeth = teeth.filter((t) => t.quadrant.includes("U"));
  const lowerTeeth = teeth.filter((t) => t.quadrant.includes("L"));

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.brand} />
          <ThemedText variant="caption" style={styles.loadingText}>
            Loading dental records...
          </ThemedText>
        </View>
      </View>
    );
  }

  // Show error state
  if (isError) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ThemedText variant="largeTitle">📋</ThemedText>
          <ThemedText variant="headline" style={styles.errorTitle}>
            Unable to Load Dental Records
          </ThemedText>
          <ThemedText variant="caption" style={styles.errorMessage}>
            There was a problem loading your odontogram. Please try again later.
          </ThemedText>
        </View>
      </View>
    );
  }

  // Show empty state
  if (teeth.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ThemedText variant="largeTitle">🦷</ThemedText>
          <ThemedText variant="headline" style={styles.errorTitle}>
            No Dental Records Yet
          </ThemedText>
          <ThemedText variant="caption" style={styles.errorMessage}>
            Your dental chart will be populated after your first examination with our clinicians.
          </ThemedText>
        </View>
      </View>
    );
  }

  const getConditionBadgeVariant = (cond: string): any => {
    switch (cond) {
      case "healthy":
        return "success";
      case "decay":
        return "danger";
      case "filling":
        return "default";
      case "crown":
        return "info";
      default:
        return "warning";
    }
  };

  const getToothColor = (cond: string): any => {
    switch (cond) {
      case "healthy":
        return "#E2E8F0"; // Clean enamel
      case "decay":
        return colors.dangerSubtle;
      case "filling":
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
              const isSelected = selectedTooth?.toothNumber === t.toothNumber;
              const condition = (t.surfaces?.mesial || t.surfaces?.occlusal || "healthy") as string;
              return (
                <Pressable
                  key={t.toothNumber}
                  onPress={() => setSelectedTooth(t)}
                  style={[
                    styles.toothPill,
                    { backgroundColor: getToothColor(condition) },
                    isSelected && styles.toothPillSelected,
                  ]}
                >
                  <ThemedText variant="caption" style={styles.toothNum}>
                    {t.toothNumber}
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
              const isSelected = selectedTooth?.toothNumber === t.toothNumber;
              const condition = (t.surfaces?.mesial || t.surfaces?.occlusal || "healthy") as string;
              return (
                <Pressable
                  key={t.toothNumber}
                  onPress={() => setSelectedTooth(t)}
                  style={[
                    styles.toothPill,
                    { backgroundColor: getToothColor(condition) },
                    isSelected && styles.toothPillSelected,
                  ]}
                >
                  <ThemedText variant="caption" style={styles.toothNum}>
                    {t.toothNumber}
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
                  Tooth #{selectedTooth.toothNumber}
                </ThemedText>
                <ThemedText variant="caption" style={styles.toothSub}>
                  {selectedTooth.quadrant} Quadrant
                </ThemedText>
              </View>
              <Badge
                label={(selectedTooth.surfaces?.mesial || "HEALTHY").toUpperCase()}
                variant={getConditionBadgeVariant(selectedTooth.surfaces?.mesial || "healthy")}
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

            {(selectedTooth.surfaces?.mesial === "decay" || selectedTooth.surfaces?.occlusal === "decay") ? (
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
  centerContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  loadingText: {
    color: colors.secondaryLabel,
    marginTop: spacing.sm,
  },
  errorTitle: {
    color: colors.label,
    textAlign: "center",
  },
  errorMessage: {
    color: colors.secondaryLabel,
    textAlign: "center",
    paddingHorizontal: spacing.md,
  },
  archLabel: {
    color: colors.secondaryLabel,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
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
