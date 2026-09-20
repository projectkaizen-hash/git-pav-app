import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button } from "@/components";
import { colors, spacing } from "@/theme";

export default function OnboardingProfileScreen() {
  const router = useRouter();
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const handleNext = () => {
    router.push("/(onboarding)/address");
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
              STEP 1 OF 4
            </ThemedText>
            <ThemedText variant="largeTitle" style={styles.title}>
              Personal Details
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              Required for your legal NHS/private dental patient record.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <Input
              label="Date of Birth"
              placeholder="DD / MM / YYYY"
              keyboardType="numbers-and-punctuation"
              value={dob}
              onChangeText={setDob}
            />

            <Input
              label="Gender / Pronouns (Optional)"
              placeholder="e.g. Female, Male, Non-binary"
              value={gender}
              onChangeText={setGender}
            />

            <Input
              label="Emergency Contact Name"
              placeholder="Next of kin or contact"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
            />

            <Input
              label="Emergency Contact Phone"
              placeholder="+44 7123 456789"
              keyboardType="phone-pad"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Continue to Address"
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

