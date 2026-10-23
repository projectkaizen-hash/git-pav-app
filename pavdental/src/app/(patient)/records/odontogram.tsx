import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ThemedText, Card, Badge, AppIcon, MetricRing, Button } from "@/components";
import { colors, spacing, radius } from "@/theme";
import { ToothRecord, ToothCondition } from "@/features/records/records-types";
import { useOdontogram } from "@/features/hooks/use-dental-api";
import { useCurrentUser } from "@/features/auth/auth-store";
import { useBookingStore } from "@/features/booking/booking-store";

const STANDARD_TEETH: ToothRecord[] = Array.from({ length: 32 }, (_, idx) => {
  const num = idx + 1;
  const quadrant = num <= 8 ? "UR" : num <= 16 ? "UL" : num <= 24 ? "LL" : "LR";
  return {
    id: `tooth-${num}`,
    patientId: "",
    toothNumber: num,
    quadrant,
    surfaces: { occlusal: "healthy" },
    notes: "Sound",
    updatedAt: new Date(0).toISOString(),
  };
});

type ProgressTab = "coverage" | "pressure" | "scrubbing";

const METRIC_DETAILS: Record<
  ProgressTab,
  { title: string; score: string; summary: string }
> = {
  coverage: {
    title: "Coverage Breakdown (85%)",
    score: "85%",
    summary:
      "Upper and lower buccal surfaces reached consistently; focus extra time on posterior lingual surfaces (#31–#32).",
  },
  pressure: {
    title: "Pressure Control (90%)",
    score: "90%",
    summary:
      "Optimal 150g brushing force maintained across all four quadrants with zero gum-recession overpressure spikes.",
  },
  scrubbing: {
    title: "Scrubbing Cadence (75%)",
    score: "75%",
    summary:
      "Good Modified Bass circular motion on molars; reduce rapid horizontal scrubbing along lower premolars.",
  },
};

function getOverallCondition(t?: ToothRecord): ToothCondition {
  if (!t) return "healthy";
  const conds = Object.values(t.surfaces || {});
  if (conds.includes("decay")) return "decay";
  if (conds.includes("filling")) return "filling";
  if (conds.includes("crown")) return "crown";
  if (conds.includes("missing")) return "missing";
  return "healthy";
}

function getToothAnatomy(toothNumber: number) {
  const isUpper = toothNumber <= 16;
  const quadrant = isUpper
    ? (toothNumber <= 8 ? "UR" : "UL")
    : (toothNumber <= 24 ? "LL" : "LR");

  let fdi = 11;
  let type = "Molar";
  if (toothNumber <= 8) {
    fdi = 10 + (9 - toothNumber);
  } else if (toothNumber <= 16) {
    fdi = 20 + (toothNumber - 8);
  } else if (toothNumber <= 24) {
    fdi = 30 + (25 - toothNumber);
  } else {
    fdi = 40 + (toothNumber - 24);
  }

  const lastDigit = fdi % 10;
  if (lastDigit === 1) type = "Central Incisor";
  else if (lastDigit === 2) type = "Lateral Incisor";
  else if (lastDigit === 3) type = "Canine";
  else if (lastDigit === 4) type = "First Premolar";
  else if (lastDigit === 5) type = "Second Premolar";
  else if (lastDigit === 6) type = "First Molar";
  else if (lastDigit === 7) type = "Second Molar";
  else if (lastDigit === 8) type = "Third Molar";

  const archName = isUpper ? "Maxillary Arch" : "Mandibular Arch";
  const side = quadrant.includes("R") ? "Right" : "Left";

  return {
    fdi: `#${fdi}`,
    universal: `#${toothNumber}`,
    quadrant,
    archName,
    fullName: `${side} ${type}`,
    type,
  };
}

export default function OdontogramScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const { setService } = useBookingStore();
  const userId = user?.id || "";
  const { data: apiTeeth } = useOdontogram(userId);
  const teeth: ToothRecord[] = React.useMemo(() => {
    const rawList = Array.isArray(apiTeeth)
      ? apiTeeth
      : Array.isArray((apiTeeth as any)?.teeth)
        ? (apiTeeth as any).teeth
        : [];
    return STANDARD_TEETH.map((base) => {
      const match = rawList.find(
        (t: any) => Number(t.toothNumber ?? t.number) === base.toothNumber
      );
      if (!match) return base;
      const mappedCond: ToothCondition =
        match.condition === "decay"
          ? "decay"
          : match.condition === "filled" || match.condition === "filling"
            ? "filling"
            : match.condition === "crown"
              ? "crown"
              : match.condition === "missing"
                ? "missing"
                : "healthy";
      return {
        ...base,
        ...match,
        toothNumber: base.toothNumber,
        quadrant: match.quadrant || base.quadrant,
        surfaces: match.surfaces || { occlusal: mappedCond },
        notes: match.notes || base.notes,
      };
    });
  }, [apiTeeth]);

  const params = useLocalSearchParams<{ toothModal?: string; tooth?: string }>();
  const [activeTab, setActiveTab] = useState<ProgressTab>("pressure");
  const [selectedToothNumber, setSelectedToothNumber] = useState<number>(
    params.tooth ? parseInt(params.tooth, 10) || 31 : 31
  ); // Lower Right molar
  const [showToothModal, setShowToothModal] = useState<boolean>(false);

  useEffect(() => {
    if (params.toothModal === "true") {
      setShowToothModal(true);
    }
    if (params.tooth) {
      setSelectedToothNumber(parseInt(params.tooth, 10) || 31);
    }
  }, [params.toothModal, params.tooth]);

  // Filter 32 teeth into Maxillary (Upper) and Mandibular (Lower)
  const upperTeeth = teeth.filter((t) => t.quadrant.includes("U"));
  const lowerTeeth = teeth.filter((t) => t.quadrant.includes("L"));

  const selectedTooth = teeth.find((t) => t.toothNumber === selectedToothNumber) || teeth[0];
  const anatomy = selectedTooth ? getToothAnatomy(selectedTooth.toothNumber) : getToothAnatomy(31);
  const selectedCondition = getOverallCondition(selectedTooth);

  const handleSelectTooth = (toothNumber: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedToothNumber(toothNumber);
  };

  const handleBookToothTreatment = () => {
    setShowToothModal(false);
    setService({
      id: "srv_restoration",
      name: `Restoration: Tooth #${selectedTooth.toothNumber} (${anatomy.fullName})`,
      category: "restorative",
      pricePence: selectedCondition === "decay" ? 14000 : 9500,
      depositPence: 2500,
      durationMinutes: 45,
      supportedChannels: ["clinic", "van"],
      description: `Targeted clinical treatment for tooth #${selectedTooth.toothNumber}.`,
      isActive: true,
      requiresOdontogram: true,
    } as any);
    router.push("/(patient)/booking/clinic-picker" as never);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Header: Back + Title "Clean Progress" + Right Hygiene Icon */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <AppIcon name="chevronLeft" size={16} color={colors.ink} />
          </Pressable>

          <ThemedText variant="headline" style={styles.headerTitle}>
            Clean Progress
          </ThemedText>

          <View style={styles.hygieneIconCircle}>
            <AppIcon name="sparkle" size={16} color={colors.info} />
          </View>
        </View>

        {/* 3D Visual Dental Arch Model with Interactive Risk Annotation */}
        <Card elevation="raised" style={styles.archContainer}>
          <View style={styles.archModelWrapper}>
            {/* Upper Jaw Arch */}
            <View style={styles.archRow}>
              <View style={styles.gumRidgeUpper}>
                {upperTeeth.map((t) => {
                  const cond = getOverallCondition(t);
                  const isDecay = cond === "decay";
                  const isSelected = t.toothNumber === selectedToothNumber;
                  return (
                    <Pressable
                      key={t.toothNumber}
                      accessibilityRole="button"
                      accessibilityLabel={`Tooth ${t.toothNumber}: ${cond}`}
                      onPress={() => handleSelectTooth(t.toothNumber)}
                      style={[
                        styles.toothCapsule,
                        isDecay && styles.toothDecay,
                        isSelected && styles.toothSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.enamelDot,
                          isDecay && styles.enamelDotDecay,
                          isSelected && styles.enamelDotSelected,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Interactive Callout Pin: "Early Risk 15–25%" (Matches Reference 2) */}
            <Pressable
              onPress={() => {
                handleSelectTooth(31);
                setShowToothModal(true);
              }}
              style={styles.calloutWrapper}
            >
              <View style={styles.riskPin}>
                <ThemedText variant="caption" style={styles.riskLabel}>
                  Early Risk · Tooth #31
                </ThemedText>
                <View style={styles.riskPill}>
                  <ThemedText variant="caption" style={styles.riskValue}>
                    Tap to inspect
                  </ThemedText>
                </View>
              </View>
              <View style={styles.riskPointerLine} />
              <View style={styles.riskTargetDot} />
            </Pressable>

            {/* Lower Jaw Arch */}
            <View style={styles.archRow}>
              <View style={styles.gumRidgeLower}>
                {lowerTeeth.map((t) => {
                  const cond = getOverallCondition(t);
                  const isDecay = cond === "decay";
                  const isSelected = t.toothNumber === selectedToothNumber;
                  return (
                    <Pressable
                      key={t.toothNumber}
                      accessibilityRole="button"
                      accessibilityLabel={`Tooth ${t.toothNumber}: ${cond}`}
                      onPress={() => handleSelectTooth(t.toothNumber)}
                      style={[
                        styles.toothCapsule,
                        isDecay && styles.toothDecay,
                        isSelected && styles.toothSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.enamelDot,
                          isDecay && styles.enamelDotDecay,
                          isSelected && styles.enamelDotSelected,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Selected Tooth Detail Banner */}
          {selectedTooth ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View tooth details"
              onPress={() => setShowToothModal(true)}
              style={styles.selectedDetail}
            >
              <View style={styles.selectedDetailLeft}>
                <ThemedText variant="headline" style={styles.selectedToothTitle}>
                  Tooth #{selectedTooth.toothNumber} · {anatomy.fullName}
                </ThemedText>
                <ThemedText variant="caption" style={styles.selectedToothSub}>
                  {anatomy.fdi} ({selectedTooth.quadrant}) · {anatomy.archName} · Tap to inspect
                </ThemedText>
              </View>
              <View style={styles.selectedDetailRight}>
                <Badge
                  label={selectedCondition === "decay" ? "EARLY RISK" : selectedCondition.toUpperCase()}
                  variant={selectedCondition === "decay" ? "danger" : "success"}
                />
                <AppIcon name="chevronRight" size={16} color={colors.secondaryLabel} />
              </View>
            </Pressable>
          ) : null}
        </Card>

        {/* Filter Chips: [Coverage], [Pressure], [Scrubbing] (Matches Reference 2) */}
        <View style={styles.filterChipRow}>
          {(["coverage", "pressure", "scrubbing"] as ProgressTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setActiveTab(tab);
                }}
                style={[
                  styles.filterChip,
                  isActive ? styles.filterChipActive : styles.filterChipInactive,
                ]}
              >
                <ThemedText
                  variant="subhead"
                  style={[
                    styles.filterChipText,
                    isActive ? styles.filterChipTextActive : styles.filterChipTextInactive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* 3 Metric Ring Gauges in a Row (Matches Reference 2) */}
        <View style={styles.metricRow}>
          <MetricRing percentage={85} label="Coverage" color="#06B6D4" />
          <MetricRing percentage={90} label="Pressure" color="#8B5CF6" />
          <MetricRing percentage={75} label="Scrubbing" color="#EC4899" />
        </View>

        {/* Active Metric Breakdown Card */}
        <Card elevation="flat" style={styles.selectedDetail}>
          <View style={styles.selectedDetailLeft}>
            <ThemedText variant="headline" style={styles.selectedToothTitle}>
              {METRIC_DETAILS[activeTab].title}
            </ThemedText>
            <ThemedText variant="caption" style={styles.selectedToothSub}>
              {METRIC_DETAILS[activeTab].summary}
            </ThemedText>
          </View>
        </Card>

        {/* Session Timer Card (Matches Reference 2) */}
        <Card elevation="raised" style={styles.timerCard}>
          <AppIcon name="clock" size={16} color={colors.secondaryLabel} />
          <ThemedText variant="largeTitle" style={styles.timerText}>
            00:32
          </ThemedText>
          <ThemedText variant="caption" style={styles.timerSub}>
            Recommended daily brushing time: 02:00
          </ThemedText>
        </Card>
      </ScrollView>

      {/* Frame 3: Interactive Tooth Deep-Dive Sheet Modal (Neo Financial Itemized Detail Pattern) */}
      <Modal
        visible={showToothModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowToothModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowToothModal(false)} />

          <View style={styles.sheetContainer}>
            {/* Grabber handle */}
            <View style={styles.sheetGrabber} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View>
                <ThemedText variant="headline" style={styles.sheetTitle}>
                  Tooth #{selectedTooth.toothNumber} ({anatomy.fdi})
                </ThemedText>
                <ThemedText variant="caption" style={styles.sheetSub}>
                  {anatomy.fullName} · {anatomy.archName}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setShowToothModal(false)}
                style={styles.closeBtn}
              >
                <AppIcon name="close" size={16} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScroll}
            >
              {/* Condition & Diagnostic Status Card */}
              <Card elevation="flat" style={styles.diagnosticCard}>
                <View style={styles.diagnosticRow}>
                  <View style={styles.statusGroup}>
                    <ThemedText variant="caption" style={styles.cardSectionLabel}>
                      CLINICAL STATUS
                    </ThemedText>
                    <ThemedText variant="headline" style={styles.statusHeading}>
                      {selectedCondition === "decay" ? "Early Occlusal Demineralisation" : "Sound Enamel Structure"}
                    </ThemedText>
                  </View>
                  <Badge
                    label={selectedCondition === "decay" ? "EARLY RISK" : "HEALTHY"}
                    variant={selectedCondition === "decay" ? "danger" : "success"}
                  />
                </View>
              </Card>

              {/* 5 Anatomical Surfaces Breakdown */}
              <View style={styles.surfaceSection}>
                <ThemedText variant="caption" style={styles.sectionHeader}>
                  ANATOMICAL SURFACES (MODBL)
                </ThemedText>
                <View style={styles.surfaceGrid}>
                  {[
                    { name: "Occlusal (Biting)", status: selectedCondition === "decay" ? "Demineralised" : "Sound", risk: selectedCondition === "decay" },
                    { name: "Mesial (Front)", status: "Sound", risk: false },
                    { name: "Distal (Rear)", status: "Sound", risk: false },
                    { name: "Buccal (Cheek)", status: "Sound", risk: false },
                    { name: "Lingual (Tongue)", status: "Sound", risk: false },
                  ].map((s) => (
                    <View key={s.name} style={styles.surfaceRow}>
                      <View style={styles.surfaceIndicatorRow}>
                        <View style={[styles.surfaceDot, s.risk && styles.surfaceDotRisk]} />
                        <ThemedText variant="subhead" style={styles.surfaceName}>
                          {s.name}
                        </ThemedText>
                      </View>
                      <ThemedText
                        variant="caption"
                        style={[styles.surfaceStatus, s.risk && styles.surfaceStatusRisk]}
                      >
                        {s.status}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>

              {/* Bitewing Radiograph & Digital Imaging Crop */}
              <Card elevation="raised" style={styles.xrayCard}>
                <View style={styles.xrayHeader}>
                  <View style={styles.xrayHeaderLeft}>
                    <AppIcon name="camera" size={14} color={colors.info} />
                    <ThemedText variant="caption" style={styles.xrayTitle}>
                      Digital Radiograph Crop (Bitewing #{anatomy.fdi.replace("#", "")})
                    </ThemedText>
                  </View>
                  <ThemedText variant="mono" style={styles.xrayMeta}>
                    70kV · 0.12s
                  </ThemedText>
                </View>

                {/* Simulated High-Res Radiograph Viewer Screen */}
                <View style={styles.radiographScreen}>
                  <View style={styles.radiographGridLines} />
                  <View style={styles.radiographToothShape}>
                    <View style={styles.radiographCrown} />
                    <View style={styles.radiographRootLeft} />
                    <View style={styles.radiographRootRight} />
                  </View>
                  <View style={styles.radiographAnnotation}>
                    <ThemedText variant="caption" style={styles.radiographAnnotationText}>
                      Enamel Density: 98% · Bone Crest: Normal
                    </ThemedText>
                  </View>
                </View>
              </Card>

              {/* Clinician Recommendation Note */}
              <Card elevation="flat" style={styles.clinicianNoteCard}>
                <View style={styles.clinicianNoteHeader}>
                  <AppIcon name="userCheck" size={16} color={colors.ink} />
                  <ThemedText variant="subhead" style={styles.clinicianName}>
                    Dr. Tariq Pav · BDS (Lon), GDC #244910
                  </ThemedText>
                </View>
                <ThemedText variant="body" style={styles.clinicianNoteBody}>
                  {selectedCondition === "decay"
                    ? "“Mild demineralisation visible along the occlusal groove. We advise preventative fluoride sealing or a micro-composite restoration before deeper cavitation develops.”"
                    : "“Enamel density is optimal. No active caries or apical pathology detected. Maintain 2-minute daily brushing with fluoridated paste.”"}
                </ThemedText>
              </Card>

              {/* Financial Estimate & 0% Care Financing Link */}
              <Card elevation="raised" style={styles.financeCard}>
                <View style={styles.financeCardRow}>
                  <View>
                    <ThemedText variant="caption" style={styles.cardSectionLabel}>
                      ESTIMATED TREATMENT
                    </ThemedText>
                    <ThemedText variant="headline" style={styles.priceHeading}>
                      {selectedCondition === "decay" ? "£140.00" : "Included in Routine Check"}
                    </ThemedText>
                  </View>
                  {selectedCondition === "decay" && (
                    <Pressable
                      onPress={() => {
                        setShowToothModal(false);
                        router.push("/(patient)/records/financing" as never);
                      }}
                      style={styles.financePill}
                    >
                      <AppIcon name="creditCard" size={13} color={colors.ink} />
                      <ThemedText variant="caption" style={styles.financePillText}>
                        0% from £23.33/mo ›
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              </Card>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.sheetFooter}>
              <Button
                title={selectedCondition === "decay" ? `Book Treatment for Tooth #${selectedTooth.toothNumber}` : "Book Hygiene Clean"}
                variant="primary"
                size="lg"
                onPress={handleBookToothTreatment}
              />
              <Button
                title="Close"
                variant="ghost"
                size="md"
                onPress={() => setShowToothModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  archContainer: {
    backgroundColor: colors.systemBackground,
    borderRadius: 24,
    gap: spacing.md,
    padding: spacing.md,
  },
  archModelWrapper: {
    alignItems: "center",
    gap: 12,
    paddingVertical: spacing.sm,
    position: "relative",
  },
  archRow: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  backBtn: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: radius.full,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  calloutWrapper: {
    alignItems: "center",
    marginVertical: 4,
    position: "relative",
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
  enamelDot: {
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    height: 12,
    width: 8,
  },
  enamelDotDecay: {
    backgroundColor: colors.danger,
  },
  enamelDotSelected: {
    backgroundColor: colors.ink,
  },
  filterChip: {
    borderRadius: radius.full,
    flex: 1,
    paddingVertical: 10,
  },
  filterChipActive: {
    alignItems: "center",
    backgroundColor: colors.ink,
    justifyContent: "center",
  },
  filterChipInactive: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderWidth: 1,
    justifyContent: "center",
  },
  filterChipRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: colors.alwaysWhite,
  },
  filterChipTextInactive: {
    color: colors.label,
  },
  gumRidgeLower: {
    alignItems: "center",
    backgroundColor: "#FCE7F3",
    borderColor: "#F472B6",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: "95%",
  },
  gumRidgeUpper: {
    alignItems: "center",
    backgroundColor: "#FCE7F3",
    borderColor: "#F472B6",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: "95%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: colors.label,
    fontSize: 18,
    fontWeight: "700",
  },
  hygieneIconCircle: {
    alignItems: "center",
    backgroundColor: colors.infoSubtle,
    borderRadius: radius.full,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  riskLabel: {
    color: colors.label,
    fontSize: 12,
    fontWeight: "600",
  },
  riskPill: {
    backgroundColor: colors.inkSubtle,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  riskPin: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    zIndex: 2,
  },
  riskPointerLine: {
    backgroundColor: colors.secondaryLabel,
    height: 14,
    width: 1.5,
  },
  riskTargetDot: {
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    height: 8,
    width: 8,
  },
  riskValue: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "700",
  },
  selectedDetail: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  selectedDetailLeft: {
    flex: 1,
    gap: 2,
  },
  selectedDetailRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  selectedToothSub: {
    color: colors.secondaryLabel,
  },
  selectedToothTitle: {
    color: colors.label,
    fontSize: 15,
  },
  timerCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    gap: 4,
    paddingVertical: spacing.lg,
  },
  timerSub: {
    color: colors.secondaryLabel,
  },
  timerText: {
    color: colors.label,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 1,
  },
  toothCapsule: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 16,
  },
  toothDecay: {
    backgroundColor: colors.dangerSubtle,
    borderColor: colors.danger,
  },
  toothSelected: {
    borderColor: colors.ink,
    borderWidth: 2,
  },
  /* Tooth Detail Sheet Modal Styles */
  modalOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: colors.systemBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: spacing.sm,
    maxHeight: "88%",
    paddingBottom: 28,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  sheetGrabber: {
    alignSelf: "center",
    backgroundColor: colors.separator,
    borderRadius: 3,
    height: 4,
    marginBottom: spacing.xs,
    width: 36,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.xs,
  },
  sheetTitle: {
    color: colors.label,
    fontSize: 18,
    fontWeight: "700",
  },
  sheetSub: {
    color: colors.secondaryLabel,
    fontSize: 12,
  },
  closeBtn: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: radius.full,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  sheetScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  diagnosticCard: {
    backgroundColor: colors.secondaryBackground,
    padding: spacing.sm,
  },
  diagnosticRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusGroup: {
    flex: 1,
    gap: 2,
  },
  cardSectionLabel: {
    color: colors.secondaryLabel,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statusHeading: {
    color: colors.label,
    fontSize: 14,
    fontWeight: "600",
  },
  surfaceSection: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 16,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  sectionHeader: {
    color: colors.secondaryLabel,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  surfaceGrid: {
    gap: 6,
  },
  surfaceRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  surfaceIndicatorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  surfaceDot: {
    backgroundColor: colors.success,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  surfaceDotRisk: {
    backgroundColor: colors.danger,
  },
  surfaceName: {
    color: colors.label,
    fontSize: 13,
  },
  surfaceStatus: {
    color: colors.secondaryLabel,
    fontSize: 12,
  },
  surfaceStatusRisk: {
    color: colors.danger,
    fontWeight: "600",
  },
  xrayCard: {
    backgroundColor: "#0F172A",
    borderColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  xrayHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  xrayHeaderLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  xrayTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  xrayMeta: {
    color: "#64748B",
    fontSize: 10,
  },
  radiographScreen: {
    alignItems: "center",
    backgroundColor: "#020617",
    borderColor: "#334155",
    borderRadius: 10,
    borderWidth: 1,
    height: 84,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  radiographGridLines: {
    ...StyleSheet.absoluteFill,
    borderColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
  },
  radiographToothShape: {
    alignItems: "center",
    gap: 2,
  },
  radiographCrown: {
    backgroundColor: "#94A3B8",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    height: 22,
    opacity: 0.8,
    width: 28,
  },
  radiographRootLeft: {
    backgroundColor: "#64748B",
    borderBottomLeftRadius: 6,
    height: 24,
    opacity: 0.7,
    position: "absolute",
    right: 15,
    top: 23,
    width: 8,
  },
  radiographRootRight: {
    backgroundColor: "#64748B",
    borderBottomRightRadius: 6,
    height: 24,
    left: 15,
    opacity: 0.7,
    position: "absolute",
    top: 23,
    width: 8,
  },
  radiographAnnotation: {
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderRadius: 4,
    bottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    position: "absolute",
  },
  radiographAnnotationText: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "500",
  },
  clinicianNoteCard: {
    backgroundColor: colors.secondaryBackground,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  clinicianNoteHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  clinicianName: {
    color: colors.label,
    fontSize: 12,
    fontWeight: "600",
  },
  clinicianNoteBody: {
    color: colors.secondaryLabel,
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
  },
  financeCard: {
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.sm,
  },
  financeCardRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  priceHeading: {
    color: colors.label,
    fontSize: 16,
    fontWeight: "700",
  },
  financePill: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: radius.full,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  financePillText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "700",
  },
  sheetFooter: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
});
