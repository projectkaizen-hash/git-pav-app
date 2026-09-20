import React from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components";
import { useCurrentUser } from "@/features/auth/auth-store";
import { usePatientProfile, useUpdateProfileMutation } from "@/features/hooks/use-dental-api";
import { PersonalInfoForm, PersonalInfoFormData } from "@/components/forms/PersonalInfoForm";
import { colors, spacing } from "@/theme";

export default function PersonalInfoScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const userId = user?.id || "";

  const { data: profile, isLoading: isLoadingProfile, error: profileError } = usePatientProfile(userId);
  const updateProfile = useUpdateProfileMutation(userId);

  const handleSubmit = async (formData: PersonalInfoFormData) => {
    try {
      await updateProfile.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob,
        gender: formData.gender,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city,
        postcode: formData.postcode,
        phone: formData.phone,
      });

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics optional
      }

      Alert.alert("Success", "Your personal details have been updated successfully.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Haptics optional
      }
      Alert.alert("Update Failed", error?.message || "Failed to update your details. Please try again.");
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoadingProfile) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (profileError) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            Failed to load your profile. Please check your connection and try again.
          </ThemedText>
        </View>
      </View>
    );
  }

  // Transform profile data to form format
  const initialData: Partial<PersonalInfoFormData> = {
    firstName: profile?.firstName || user?.firstName || "",
    lastName: profile?.lastName || user?.lastName || "",
    dob: profile?.dob ? new Date(profile.dob).toISOString().split("T")[0] : "",
    gender: (profile?.gender as any) || "prefer_not_to_say",
    addressLine1: profile?.address?.line1 || "",
    addressLine2: profile?.address?.line2 || "",
    city: profile?.address?.city || "",
    postcode: profile?.address?.postcode || "",
    phone: profile?.phone || user?.phone || "",
  };

  return (
    <View style={styles.container}>
      <PersonalInfoForm
        initialData={initialData}
        email={profile?.email || user?.email || ""}
        isEmailVerified={user?.emailVerified ?? true}
        onSubmit={handleSubmit}
        isLoading={updateProfile.isPending}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  errorContainer: {
    backgroundColor: colors.dangerSubtle,
    borderRadius: 8,
    padding: spacing.md,
  },
  errorText: {
    color: colors.danger,
    textAlign: "center",
  },
});