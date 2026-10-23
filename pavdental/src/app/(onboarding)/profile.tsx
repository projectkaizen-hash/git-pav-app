import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button, ProgressPills } from "@/components";
import { colors, spacing } from "@/theme";
import { useOnboardingStore } from "@/features/onboarding/onboarding-store";

export default function OnboardingProfileScreen() {
  const router = useRouter();
  const [dob, setDob] = useState("");
  const [dobError, setDobError] = useState<string | null>(null);
  const [gender, setGender] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const setProfile = useOnboardingStore((s) => s.setProfile);

  /** DD/MM/YYYY → ISO YYYY-MM-DD (backend contract) */
  const toIsoDob = (value: string): string | null => {
    const m = value.trim().match(/^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/);
    if (!m) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
  };

  const handleNext = () => {
    const isoDob = toIsoDob(dob);
    if (!isoDob) {
      setDobError("Please enter your date of birth as DD / MM / YYYY (e.g. 15/04/1990)");
      return;
    }
    setProfile({
      dob: isoDob,
      gender: gender.trim(),
      emergencyContactName: emergencyContact.trim(),
      emergencyContactPhone: emergencyPhone.trim(),
    });
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
            <ProgressPills total={5} current={1} />
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
              error={dobError ?? undefined}
              onChangeText={(val) => {
                setDob(val);
                if (dobError) setDobError(null);
              }}
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
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
});

