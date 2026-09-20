import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button } from "@/components";
import { colors, spacing } from "@/theme";

export default function OnboardingAddressScreen() {
  const router = useRouter();
  const [postcode, setPostcode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");

  const handleNext = () => {
    router.push("/(onboarding)/medical-history");
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
            <ThemedText variant="caption" style={styles.stepBadge}>
              STEP 2 OF 4
            </ThemedText>
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
              onChangeText={setPostcode}
            />

            <Input
              label="Address Line 1"
              placeholder="House number & street name"
              value={addressLine1}
              onChangeText={setAddressLine1}
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
              onChangeText={setCity}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Continue to Medical History"
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
  stepBadge: {
    color: colors.brand,
    fontWeight: "700",
    letterSpacing: 1,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});

