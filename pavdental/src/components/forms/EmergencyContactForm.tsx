import React from "react";
import { View, StyleSheet, ScrollView, Alert, Pressable } from "react-native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ThemedText } from "../themed-text";
import { Input } from "../input";
import { Button } from "../button";
import { colors, spacing } from "@/theme";

import {
  emergencyContactSchema,
  EmergencyContactFormData,
} from "@/features/account/account-schemas";

export { emergencyContactSchema, EmergencyContactFormData };

export interface EmergencyContactFormProps {
  initialData?: Partial<EmergencyContactFormData>;
  onSubmit: (data: EmergencyContactFormData) => Promise<void>;
  isLoading?: boolean;
  onCancel?: () => void;
}

const RELATIONSHIP_OPTIONS: EmergencyContactFormData["relationship"][] = [
  "Spouse / Partner",
  "Parent / Guardian",
  "Sibling",
  "Child",
  "Friend",
  "Other",
];

export function EmergencyContactForm({
  initialData,
  onSubmit,
  isLoading = false,
  onCancel,
}: EmergencyContactFormProps) {
  const {
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<EmergencyContactFormData>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: {
      name: initialData?.name || "",
      relationship: initialData?.relationship || "Spouse / Partner",
      phone: initialData?.phone || "",
      alternativePhone: initialData?.alternativePhone || "",
    },
  });

  const selectedRelationship = watch("relationship");

  const handleFormSubmit = async (data: EmergencyContactFormData) => {
    try {
      await onSubmit(data);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update emergency contact. Please try again.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.infoBanner}>
        <ThemedText style={styles.infoIcon}>🆘</ThemedText>
        <ThemedText variant="caption" style={styles.infoText}>
          Your designated emergency contact will only be contacted in urgent situations during clinical or mobile dental appointments.
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          CONTACT DETAILS
        </ThemedText>

        <Input
          label="Full Name *"
          placeholder="e.g. Eleanor Jenkins"
          error={errors.name?.message}
          value={watch("name")}
          onChangeText={(txt) => setValue("name", txt, { shouldDirty: true, shouldValidate: true })}
          editable={!isLoading}
        />

        <View style={styles.relationshipContainer}>
          <ThemedText variant="subhead" style={styles.fieldLabel}>
            Relationship to you *
          </ThemedText>
          <View style={styles.pillsWrap}>
            {RELATIONSHIP_OPTIONS.map((rel) => {
              const active = selectedRelationship === rel;
              return (
                <Pressable
                  key={rel}
                  disabled={isLoading}
                  onPress={() => setValue("relationship", rel, { shouldDirty: true, shouldValidate: true })}
                  style={[styles.pill, active && styles.pillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <ThemedText variant="caption" style={[styles.pillText, active && styles.pillTextActive]}>
                    {rel}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Input
          label="Primary Phone Number *"
          placeholder="+44 7XXX XXXXXX"
          keyboardType="phone-pad"
          error={errors.phone?.message}
          value={watch("phone")}
          onChangeText={(txt) => setValue("phone", txt, { shouldDirty: true, shouldValidate: true })}
          editable={!isLoading}
        />

        <Input
          label="Alternative Phone (Optional)"
          placeholder="e.g. Work or landline"
          keyboardType="phone-pad"
          error={errors.alternativePhone?.message}
          value={watch("alternativePhone")}
          onChangeText={(txt) => setValue("alternativePhone", txt, { shouldDirty: true })}
          editable={!isLoading}
        />
      </View>

      <View style={styles.actions}>
        <Button
          title={isLoading ? "Saving contact..." : "Save Emergency Contact"}
          onPress={handleSubmit(handleFormSubmit)}
          disabled={isLoading || !isDirty}
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
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  fieldLabel: {
    color: colors.label,
    fontSize: 13,
    fontWeight: "600",
  },
  infoBanner: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  infoIcon: {
    fontSize: 22,
  },
  infoText: {
    color: colors.secondaryLabel,
    flex: 1,
    lineHeight: 18,
  },
  pill: {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pillActive: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
  },
  pillText: {
    color: colors.secondaryLabel,
    fontWeight: "500",
  },
  pillTextActive: {
    color: colors.brand,
    fontWeight: "700",
  },
  pillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  relationshipContainer: {
    gap: spacing.xs,
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
});

