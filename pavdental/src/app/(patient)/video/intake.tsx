import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Input, Button, Card } from "@/components";
import { colors, spacing } from "@/theme";

export default function VideoIntakeScreen() {
  const router = useRouter();
  const [symptomText, setSymptomText] = useState("");
  const [painLevel, setPainLevel] = useState<number>(5);
  const [hasSwelling, setHasSwelling] = useState(false);
  const [duration, setDuration] = useState("Past 24-48 hours");
  const [dualRecordingConsent, setDualRecordingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const painLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const durations = ["Less than 24 hours", "Past 24-48 hours", "Over a week"];

  const handleContinue = () => {
    if (!symptomText.trim()) {
      setError("Please describe the main issue or symptom you are experiencing.");
      return;
    }
    if (!dualRecordingConsent) {
      setError("Please consent to the clinical consultation terms to continue.");
      return;
    }
    router.push("/(patient)/video/photos" as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            What's bothering you?
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Your triage answers are sent directly to the examining dentist before they connect.
          </ThemedText>
        </View>

        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <ThemedText variant="caption" style={styles.errorText}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        {/* Symptoms Description */}
        <Input
          label="Describe your symptoms / dental issue"
          placeholder="e.g. Constant throbbing pain on lower right molar when drinking cold fluids"
          multiline
          numberOfLines={4}
          containerStyle={styles.textAreaContainer}
          value={symptomText}
          onChangeText={(val) => {
            setSymptomText(val);
            if (error) setError(null);
          }}
        />

        {/* Pain Severity Scale */}
        <View style={styles.section}>
          <ThemedText variant="headline">
            Pain Severity: {painLevel} / 10
          </ThemedText>
          <ThemedText variant="caption" style={styles.sub}>
            1 = Mild discomfort, 10 = Severe, unmanageable pain
          </ThemedText>
          <View style={styles.painRow}>
            {painLevels.map((lvl) => {
              const selected = painLevel === lvl;
              return (
                <Pressable
                  key={lvl}
                  onPress={() => setPainLevel(lvl)}
                  style={[styles.painPill, selected && styles.painPillSelected]}
                >
                  <ThemedText
                    variant="caption"
                    style={[styles.painText, selected && styles.painTextSelected]}
                  >
                    {lvl}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Swelling Switch */}
        <View style={styles.switchCard}>
          <View style={styles.switchInfo}>
            <ThemedText variant="headline">Facial Swelling or Gum Boil</ThemedText>
            <ThemedText variant="caption" style={styles.sub}>
              Is there any visible swelling on your cheek, jaw or gums?
            </ThemedText>
          </View>
          <Switch
            value={hasSwelling}
            onValueChange={setHasSwelling}
            trackColor={{ true: colors.brand, false: colors.separator }}
          />
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <ThemedText variant="headline">Duration of Problem</ThemedText>
          <View style={styles.durationList}>
            {durations.map((d) => {
              const active = duration === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[styles.durationItem, active && styles.durationItemActive]}
                >
                  <ThemedText
                    variant="body"
                    style={[styles.durationText, active && styles.durationTextActive]}
                  >
                    {d}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Dual Consent */}
        <Card style={styles.consentCard}>
          <View style={styles.consentRow}>
            <View style={styles.consentInfo}>
              <ThemedText variant="headline">Clinical Video Record Consent</ThemedText>
              <ThemedText variant="caption" style={styles.sub}>
                I consent to this remote video examination under UK General Dental Council guidelines.
              </ThemedText>
            </View>
            <Switch
              value={dualRecordingConsent}
              onValueChange={(val) => {
                setDualRecordingConsent(val);
                if (error) setError(null);
              }}
              trackColor={{ true: colors.brand, false: colors.separator }}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Take Intraoral Photos ›"
          size="lg"
          onPress={handleContinue}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  consentCard: {
    backgroundColor: colors.secondaryBackground,
    padding: spacing.md,
  },
  consentInfo: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  consentRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
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
  durationItem: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: 10,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  durationItemActive: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
  },
  durationList: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  durationText: {
    color: colors.secondaryLabel,
    fontSize: 12,
    textAlign: "center",
  },
  durationTextActive: {
    color: colors.brand,
    fontWeight: "700",
  },
  errorBox: {
    backgroundColor: colors.dangerSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  errorText: {
    color: colors.danger,
  },
  footer: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  header: {
    gap: spacing.xxs,
  },
  painPill: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 30,
  },
  painPillSelected: {
    backgroundColor: colors.brand,
  },
  painRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  painText: {
    color: colors.label,
    fontWeight: "600",
  },
  painTextSelected: {
    color: colors.onBrand,
    fontWeight: "700",
  },
  section: {
    gap: spacing.xs,
  },
  sub: {
    color: colors.secondaryLabel,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  switchCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  switchInfo: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  textAreaContainer: {
    minHeight: 100,
  },
  title: {
    color: colors.label,
  },
});

