import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button, ProgressPills, IconButton } from "@/components";
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
    router.push("/onboarding/address");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.topNav}>
          <IconButton
            icon="arrowLeft"
            label="Go back"
            variant="soft"
            size={22}
            onPress={() => router.back()}
          />
          <View style={styles.progressWrap}>
            <ProgressPills total={5} current={1} />
          </View>
          <View style={styles.navSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText variant="largeTitle" style={styles.title}>
              Personal details
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              Required for your legal NHS/private dental patient record.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <Input
              label="Date of birth"
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
              label="Gender / pronouns (optional)"
              placeholder="e.g. Female, Male, Non-binary"
              value={gender}
              onChangeText={setGender}
            />

            <Input
              label="Emergency contact name"
              placeholder="Next of kin or contact"
              value={emergencyContact}
              onChangeText={setEmergencyContact}
            />

            <Input
              label="Emergency contact phone"
              placeholder="+44 7123 456789"
              keyboardType="phone-pad"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
            />
          </View>

          <View style={styles.actions}>
            <Button
              title="Continue to address"
              size="lg"
              arrow={true}
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
    marginTop: "auto",
    paddingTop: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  form: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
    marginTop: spacing.xs,
  },
  navSpacer: {
    width: 44,
  },
  progressWrap: {
    alignItems: "center",
    flex: 1,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
  },
  subtitle: {
    color: colors.secondaryLabel,
    fontSize: 15,
    lineHeight: 21,
  },
  title: {
    color: colors.label,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  topNav: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
