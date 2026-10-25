import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button, ProgressPills } from "@/components";
import { colors, spacing } from "@/theme";
import { useOnboardingStore } from "@/features/onboarding/onboarding-store";

export default function OnboardingAddressScreen() {
  const router = useRouter();
  const [postcode, setPostcode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setAddress = useOnboardingStore((s) => s.setAddress);

  const handleNext = () => {
    const errs: Record<string, string> = {};
    if (!postcode.trim()) errs.postcode = "Postcode is required.";
    if (!addressLine1.trim()) errs.addressLine1 = "Address line 1 is required.";
    if (!city.trim()) errs.city = "City is required.";

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setAddress({
      postcode: postcode.trim().toUpperCase(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim(),
    } as any);
    router.push("/onboarding/insurance");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ProgressPills total={5} current={2} />
            <ThemedText variant="largeTitle" style={styles.title}>
              Home Address
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              Used to check mobile dental van coverage and for clinic records.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <Input
              label="UK Postcode"
              placeholder="e.g. SW1A 1AA"
              autoCapitalize="characters"
              value={postcode}
              error={errors.postcode}
              onChangeText={(val) => {
                setPostcode(val);
                if (errors.postcode) setErrors((prev) => ({ ...prev, postcode: "" }));
              }}
            />

            <Input
              label="Address Line 1"
              placeholder="House number & street name"
              value={addressLine1}
              error={errors.addressLine1}
              onChangeText={(val) => {
                setAddressLine1(val);
                if (errors.addressLine1) setErrors((prev) => ({ ...prev, addressLine1: "" }));
              }}
            />

            <Input
              label="Address Line 2 (Optional)"
              placeholder="Flat, suite or apartment number"
              value={addressLine2}
              onChangeText={setAddressLine2}
            />

            <Input
              label="Town / City"
              placeholder="e.g. London"
              value={city}
              error={errors.city}
              onChangeText={(val) => {
                setCity(val);
                if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
              }}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Continue to Insurance"
              size="lg"
              onPress={handleNext}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  form: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xxs,
    marginBottom: spacing.xl,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});

