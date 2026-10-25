import React, { useState } from "react";
import { View, StyleSheet, ScrollView, TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedText, Card, Button, EmptyState } from "@/components";
import { colors, spacing } from "@/theme";
import { createTreatmentPlan } from "@/features/records/records-api";

interface PlanItem {
  code: string;
  description: string;
  costPence: number;
  toothNumber?: number;
}

const COMMON_PROCEDURES = [
  { code: "EXAM01", description: "Comprehensive Dental Examination", costPence: 6500 },
  { code: "HYG01", description: "Scale & Polish (Hygiene Session)", costPence: 7500 },
  { code: "XRAY02", description: "Intraoral Bitewing Radiographs (x2)", costPence: 3500 },
  { code: "FIL01", description: "Composite Restoration (1 surface)", costPence: 12000 },
  { code: "FIL02", description: "Composite Restoration (2 surfaces)", costPence: 16000 },
  { code: "CRWN01", description: "Zirconia / Porcelain Crown", costPence: 65000 },
  { code: "ENDO01", description: "Root Canal Therapy (Molar)", costPence: 55000 },
  { code: "EXT01", description: "Simple Dental Extraction", costPence: 14000 },
];

export default function TreatmentPlanBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    patientId: string;
    appointmentId?: string;
    patientName?: string;
  }>();

  const patientId = params.patientId || "";
  const [title, setTitle] = useState("Comprehensive Dental Treatment Plan");
  const [items, setItems] = useState<PlanItem[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<string>("");
  const [customDesc, setCustomDesc] = useState<string>("");
  const [customCostPounds, setCustomCostPounds] = useState<string>("");
  const [customCode, setCustomCode] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function addItem(proc: { code: string; description: string; costPence: number }) {
    const tooth = selectedTooth ? parseInt(selectedTooth, 10) : undefined;
    setItems((prev) => [
      ...prev,
      {
        code: proc.code,
        description: proc.description + (tooth ? ` (Tooth #${tooth})` : ""),
        costPence: proc.costPence,
        toothNumber: tooth && !isNaN(tooth) ? tooth : undefined,
      },
    ]);
    setSelectedTooth("");
  }

  function addCustomItem() {
    if (!customDesc.trim() || !customCostPounds.trim()) return;
    const costPence = Math.round(parseFloat(customCostPounds) * 100);
    if (isNaN(costPence) || costPence <= 0) return;

    const tooth = selectedTooth ? parseInt(selectedTooth, 10) : undefined;
    setItems((prev) => [
      ...prev,
      {
        code: customCode.trim() || "CUST01",
        description: customDesc.trim() + (tooth ? ` (Tooth #${tooth})` : ""),
        costPence,
        toothNumber: tooth && !isNaN(tooth) ? tooth : undefined,
      },
    ]);

    setCustomDesc("");
    setCustomCostPounds("");
    setCustomCode("");
    setSelectedTooth("");
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const totalPence = items.reduce((sum, item) => sum + item.costPence, 0);

  async function handleSavePlan() {
    if (!patientId || items.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await createTreatmentPlan(patientId, {
        title: title.trim() || "Treatment Plan",
        items,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Failed to create treatment plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Navigation */}
        <View style={styles.navRow}>
          <Button
            title="‹ Patient File"
            variant="secondary"
            size="sm"
            onPress={() => router.back()}
          />
        </View>

        <View style={styles.headerBlock}>
          <ThemedText variant="title" style={styles.title}>
            Treatment Plan Builder
          </ThemedText>
          <ThemedText variant="caption" style={styles.subtitle}>
            Patient: {params.patientName || "Verified Patient"}
          </ThemedText>
        </View>

        {success ? (
          <Card elevation="raised" style={styles.successCard}>
            <ThemedText variant="headline" style={styles.successTitle}>
              ✓ Treatment Plan Created
            </ThemedText>
            <ThemedText variant="body" style={styles.successBody}>
              Plan "{title}" has been saved with {items.length} items totaling £
              {(totalPence / 100).toFixed(2)}. The patient can review and sign it via the app.
            </ThemedText>
            <Button
              title="Return to Patient File"
              size="md"
              variant="primary"
              onPress={() => router.back()}
            />
          </Card>
        ) : (
          <>
            {error ? (
              <Card elevation="flat" style={styles.errorBanner}>
                <ThemedText variant="caption" style={styles.errorText}>
                  {error}
                </ThemedText>
              </Card>
            ) : null}

            {/* Plan Title */}
            <Card elevation="raised" style={styles.card}>
              <ThemedText variant="caption" style={styles.label}>
                PLAN TITLE:
              </ThemedText>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Comprehensive Dental Treatment Plan"
                placeholderTextColor={colors.tertiaryLabel}
              />
            </Card>

            {/* Quick Add Procedures */}
            <Card elevation="raised" style={styles.card}>
              <ThemedText variant="headline" style={styles.sectionHeading}>
                Add Standard Procedures
              </ThemedText>
              <View style={styles.toothInputRow}>
                <ThemedText variant="caption" style={styles.toothLabel}>
                  Tooth # (optional):
                </ThemedText>
                <TextInput
                  style={styles.toothInput}
                  placeholder="1-32"
                  placeholderTextColor={colors.tertiaryLabel}
                  keyboardType="numeric"
                  value={selectedTooth}
                  onChangeText={setSelectedTooth}
                />
              </View>

              <View style={styles.procGrid}>
                {COMMON_PROCEDURES.map((p) => (
                  <Button
                    key={p.code}
                    title={`+ ${p.description} (£${(p.costPence / 100).toFixed(0)})`}
                    size="sm"
                    variant="secondary"
                    onPress={() => addItem(p)}
                  />
                ))}
              </View>
            </Card>

            {/* Custom Item Form */}
            <Card elevation="raised" style={styles.card}>
              <ThemedText variant="headline" style={styles.sectionHeading}>
                Add Custom Procedure
              </ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="Description (e.g. Custom Night Guard)"
                placeholderTextColor={colors.tertiaryLabel}
                value={customDesc}
                onChangeText={setCustomDesc}
              />
              <View style={styles.customRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Code (optional)"
                  placeholderTextColor={colors.tertiaryLabel}
                  value={customCode}
                  onChangeText={setCustomCode}
                />
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="Cost (£)"
                  placeholderTextColor={colors.tertiaryLabel}
                  keyboardType="decimal-pad"
                  value={customCostPounds}
                  onChangeText={setCustomCostPounds}
                />
                <Button title="Add" size="md" variant="primary" onPress={addCustomItem} />
              </View>
            </Card>

            {/* Plan Items & Total */}
            <Card elevation="raised" style={styles.card}>
              <ThemedText variant="headline" style={styles.sectionHeading}>
                Plan Items ({items.length})
              </ThemedText>

              {items.length === 0 ? (
                <EmptyState
                  heading="No items in this plan"
                  body="Select procedures above to assemble the treatment plan."
                  icon="notes"
                />
              ) : (
                <View style={styles.itemList}>
                  {items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={styles.itemDetails}>
                        <ThemedText variant="headline" style={styles.itemDesc}>
                          {item.description}
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.itemCode}>
                          Code: {item.code} · £{(item.costPence / 100).toFixed(2)}
                        </ThemedText>
                      </View>
                      <Button
                        title="Remove"
                        size="sm"
                        variant="ghost"
                        onPress={() => removeItem(idx)}
                      />
                    </View>
                  ))}

                  <View style={styles.totalRow}>
                    <ThemedText variant="headline" style={styles.totalLabel}>
                      Total Estimated Cost:
                    </ThemedText>
                    <ThemedText variant="title" style={styles.totalVal}>
                      £{(totalPence / 100).toFixed(2)}
                    </ThemedText>
                  </View>

                  <Button
                    title={saving ? "Saving Plan…" : "Create & Send Plan"}
                    size="md"
                    variant="primary"
                    disabled={saving}
                    onPress={handleSavePlan}
                  />
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
    padding: spacing.md,
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
  customRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  errorBanner: {
    backgroundColor: colors.dangerSubtle,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  headerBlock: {
    gap: 2,
  },
  itemCode: {
    color: colors.secondaryLabel,
  },
  itemDesc: {
    color: colors.label,
  },
  itemDetails: {
    flex: 1,
    gap: 2,
  },
  itemList: {
    gap: spacing.sm,
  },
  itemRow: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.sm,
  },
  label: {
    color: colors.secondaryLabel,
    fontWeight: "700",
  },
  navRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  procGrid: {
    gap: spacing.xs,
  },
  sectionHeading: {
    color: colors.label,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  successBody: {
    color: colors.label,
  },
  successCard: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  successTitle: {
    color: colors.ink,
  },
  textInput: {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.label,
    padding: spacing.sm,
  },
  title: {
    color: colors.label,
  },
  toothInput: {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 6,
    borderWidth: 1,
    color: colors.label,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 60,
  },
  toothInputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  toothLabel: {
    color: colors.secondaryLabel,
  },
  totalLabel: {
    color: colors.label,
  },
  totalRow: {
    alignItems: "center",
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  totalVal: {
    color: colors.ink,
  },
});
