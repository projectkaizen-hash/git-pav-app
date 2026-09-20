import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert, Pressable } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ThemedText } from "../themed-text";
import { Input } from "../input";
import { Button } from "../button";
import { ToggleSwitch } from "../settings/ToggleSwitch";
import { colors, spacing } from "@/theme";

import {
  medicalHistorySchema,
  MedicalHistoryFormData,
} from "@/features/account/account-schemas";

export { medicalHistorySchema, MedicalHistoryFormData };

export interface MedicalHistoryFormProps {
  initialData?: Partial<MedicalHistoryFormData>;
  onSubmit: (data: MedicalHistoryFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

const COMMON_ALLERGIES = [
  "Penicillin",
  "Latex",
  "Local Anaesthetics",
  "Aspirin / NSAIDs",
  "Sulphonamides",
  "Codeine",
];

const COMMON_CONDITIONS = [
  "High Blood Pressure",
  "Asthma",
  "Diabetes Type 1",
  "Diabetes Type 2",
  "Heart Disease",
  "Bleeding Disorder / Anticoagulants",
  "Epilepsy",
  "Hepatitis / Liver Disease",
  "Currently Pregnant / Nursing",
];

export function MedicalHistoryForm({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
}: MedicalHistoryFormProps) {
  const [hasAllergies, setHasAllergies] = useState(
    initialData?.hasAllergies ?? (initialData?.allergies && initialData.allergies.length > 0) ?? false
  );
  const [isTakingMeds, setIsTakingMeds] = useState(
    initialData?.isTakingMedications ?? (initialData?.medications && initialData.medications.length > 0) ?? false
  );

  const {
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<MedicalHistoryFormData>({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: {
      hasAllergies,
      allergies: initialData?.allergies || [],
      allergyDetails: initialData?.allergyDetails || "",
      isTakingMedications: isTakingMeds,
      medications: initialData?.medications || [],
      medicationDetails: initialData?.medicationDetails || "",
      conditions: initialData?.conditions || [],
      gpSurgery: initialData?.gpSurgery || "",
      gpDoctorName: initialData?.gpDoctorName || "",
      gpPhone: initialData?.gpPhone || "",
      notes: initialData?.notes || "",
    },
  });

  const selectedAllergies = watch("allergies") || [];
  const selectedConditions = watch("conditions") || [];

  const toggleAllergyTag = (tag: string) => {
    const exists = selectedAllergies.includes(tag);
    const updated = exists ? selectedAllergies.filter((t) => t !== tag) : [...selectedAllergies, tag];
    setValue("allergies", updated, { shouldDirty: true });
  };

  const toggleCondition = (cond: string) => {
    const exists = selectedConditions.includes(cond);
    const updated = exists ? selectedConditions.filter((c) => c !== cond) : [...selectedConditions, cond];
    setValue("conditions", updated, { shouldDirty: true });
  };

  const handleFormSubmit = async (data: MedicalHistoryFormData) => {
    try {
      await onSubmit({
        ...data,
        hasAllergies,
        isTakingMedications: isTakingMeds,
      });
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update medical history. Please try again.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Allergies Section */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          ALLERGIES & ADVERSE REACTIONS
        </ThemedText>

        <ToggleSwitch
          label="Do you have any known allergies?"
          description="Medications, latex, food, or dental anaesthetics"
          value={hasAllergies}
          onValueChange={(val) => {
            setHasAllergies(val);
            setValue("hasAllergies", val, { shouldDirty: true });
          }}
          icon={<ThemedText>⚠️</ThemedText>}
        />

        {hasAllergies ? (
          <View style={styles.subContainer}>
            <ThemedText variant="caption" style={styles.subLabel}>
              Common Allergens (tap to select):
            </ThemedText>
            <View style={styles.tagsRow}>
              {COMMON_ALLERGIES.map((tag) => {
                const active = selectedAllergies.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleAllergyTag(tag)}
                    style={[styles.tag, active && styles.tagActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <ThemedText variant="caption" style={[styles.tagText, active && styles.tagTextActive]}>
                      {active ? "✓ " : "+ "}
                      {tag}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label="Specific Allergy Details / Symptoms"
              placeholder="e.g. Anaphylaxis to penicillin, rash with latex"
              value={watch("allergyDetails")}
              onChangeText={(txt) => setValue("allergyDetails", txt, { shouldDirty: true })}
              editable={!isLoading}
              multiline
            />
          </View>
        ) : null}
      </View>

      {/* Medications Section */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          CURRENT MEDICATIONS
        </ThemedText>

        <ToggleSwitch
          label="Are you taking regular medications?"
          description="Prescriptions, inhalers, blood thinners, OTC remedies"
          value={isTakingMeds}
          onValueChange={(val) => {
            setIsTakingMeds(val);
            setValue("isTakingMedications", val, { shouldDirty: true });
          }}
          icon={<ThemedText>💊</ThemedText>}
        />

        {isTakingMeds ? (
          <View style={styles.subContainer}>
            <Input
              label="Medication names & daily dosages"
              placeholder="e.g. Salbutamol inhaler 2 puffs, Ramipril 5mg daily"
              value={watch("medicationDetails")}
              onChangeText={(txt) => setValue("medicationDetails", txt, { shouldDirty: true })}
              editable={!isLoading}
              multiline
            />
          </View>
        ) : null}
      </View>

      {/* Medical Conditions */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          MEDICAL CONDITIONS & CLINICAL RISK
        </ThemedText>

        <View style={styles.conditionsList}>
          {COMMON_CONDITIONS.map((cond) => {
            const active = selectedConditions.includes(cond);
            return (
              <Pressable
                key={cond}
                onPress={() => toggleCondition(cond)}
                style={[styles.conditionRow, active && styles.conditionRowActive]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
              >
                <ThemedText variant="headline" style={[styles.conditionText, active && styles.conditionTextActive]}>
                  {cond}
                </ThemedText>
                <ThemedText style={active ? styles.checkActive : styles.checkInactive}>
                  {active ? "☑️" : "⬜"}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* GP Details */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          REGISTERED GP SURGERY (UK)
        </ThemedText>

        <Input
          label="GP Surgery / Practice Name *"
          placeholder="e.g. St. Mary's Medical Practice"
          error={errors.gpSurgery?.message}
          value={watch("gpSurgery")}
          onChangeText={(txt) => setValue("gpSurgery", txt, { shouldDirty: true, shouldValidate: true })}
          editable={!isLoading}
        />

        <Input
          label="Named Doctor / GP (Optional)"
          placeholder="e.g. Dr. Jane Smith"
          value={watch("gpDoctorName")}
          onChangeText={(txt) => setValue("gpDoctorName", txt, { shouldDirty: true })}
          editable={!isLoading}
        />

        <Input
          label="GP Surgery Telephone"
          placeholder="e.g. 020 7946 0123"
          keyboardType="phone-pad"
          value={watch("gpPhone")}
          onChangeText={(txt) => setValue("gpPhone", txt, { shouldDirty: true })}
          editable={!isLoading}
        />
      </View>

      {/* Clinical Notes */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          ADDITIONAL CLINICAL NOTES
        </ThemedText>

        <Input
          label="Special requests, dental anxiety, or past surgical history"
          placeholder="Let your dental team know anything else relevant..."
          value={watch("notes")}
          onChangeText={(txt) => setValue("notes", txt, { shouldDirty: true })}
          editable={!isLoading}
          multiline
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title={isLoading ? "Saving clinical records..." : "Save Medical History"}
          onPress={handleSubmit(handleFormSubmit)}
          disabled={isLoading || (!isDirty && !hasAllergies && !isTakingMeds)}
          loading={isLoading}
        />
        {onCancel ? (
          <Button
            title="Cancel"
            variant="secondary"
            onPress={onCancel}
            disabled={isLoading}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  checkActive: {
    fontSize: 18,
  },
  checkInactive: {
    fontSize: 18,
    opacity: 0.4,
  },
  conditionRow: {
    alignItems: "center",
    borderBottomColor: colors.separator,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  conditionRowActive: {
    backgroundColor: colors.brandSubtle,
  },
  conditionText: {
    color: colors.label,
    flex: 1,
    fontSize: 14,
  },
  conditionTextActive: {
    color: colors.brand,
    fontWeight: "600",
  },
  conditionsList: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    overflow: "hidden",
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.secondaryLabel,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  subContainer: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    gap: spacing.sm,
    padding: spacing.md,
  },
  subLabel: {
    color: colors.secondaryLabel,
    fontWeight: "600",
  },
  tag: {
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tagActive: {
    backgroundColor: colors.dangerSubtle,
    borderColor: colors.danger,
  },
  tagText: {
    color: colors.label,
  },
  tagTextActive: {
    color: colors.danger,
    fontWeight: "700",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
});
