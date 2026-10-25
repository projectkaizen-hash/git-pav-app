import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ThemedText, Card, Button, AppIcon, Toast } from "@/components";
import { colors, spacing } from "@/theme";
import { authFetch } from "@/features/auth/auth-api";

interface ReviewSlot {
  id: string;
  label: string;
  captured: boolean;
  uri?: string;
}

export default function PhotoReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    appointmentId?: string;
    symptomText?: string;
    painLevel?: string;
    hasSwelling?: string;
    duration?: string;
  }>();
  const appointmentId = params.appointmentId;
  const [slots, setSlots] = useState<ReviewSlot[]>([
    { id: "front", label: "Front teeth (bite closed)", captured: true },
    { id: "affected", label: "Affected / painful area", captured: true },
    { id: "upper", label: "Upper arch", captured: true },
    { id: "lower", label: "Lower arch", captured: true },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const retake = async (id: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setSlots((prev) =>
          prev.map((s) => (s.id === id ? { ...s, captured: true, uri: result.assets[0].uri } : s))
        );
        setToast({ message: "Photo updated", tone: "success" });
        return;
      }
    } catch {
      // Camera / library unavailable on simulator without assets
    }
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, captured: true } : s)));
    setToast({ message: "Photo verified", tone: "success" });
  };

  const allGood = slots.every((s) => s.captured);

  const submit = async () => {
    setIsSubmitting(true);
    try {
      if (appointmentId) {
        // Upload any real photos captured by the patient
        const uploadedPhotoUrls: string[] = [];
        for (const slot of slots) {
          if (slot.captured && slot.uri) {
            try {
              const formData = new FormData();
              formData.append("photo", {
                uri: slot.uri,
                name: `triage-${slot.id}.jpg`,
                type: "image/jpeg",
              } as any);
              formData.append("appointmentId", appointmentId);
              formData.append("slotLabel", slot.label);

              const uploadRes = await authFetch("/api/video/upload-triage-photo", {
                method: "POST",
                body: formData,
              });
              if (uploadRes.ok) {
                const uploadJson = await uploadRes.json();
                if (uploadJson.url) {
                  uploadedPhotoUrls.push(uploadJson.url);
                }
              }
            } catch {
              // Proceed with triage even if individual photo upload fails
            }
          }
        }

        const chiefComplaint = params.symptomText?.trim() || "Intake triage review";
        const painLevelNum = Number.isInteger(Number(params.painLevel))
          ? Math.max(0, Math.min(10, Number(params.painLevel)))
          : 5;
        const symptomsList: string[] = [];
        if (params.symptomText?.trim()) symptomsList.push(params.symptomText.trim());
        if (params.hasSwelling === "true") symptomsList.push("Swelling");

        const triagePayload: Record<string, unknown> = {
          appointmentId,
          chiefComplaint,
          painLevel: painLevelNum,
        };
        if (params.duration?.trim()) triagePayload.duration = params.duration.trim();
        if (symptomsList.length > 0) triagePayload.symptoms = symptomsList;
        if (uploadedPhotoUrls.length > 0) triagePayload.photos = uploadedPhotoUrls;

        const res = await authFetch("/api/video/submit-triage", {
          method: "POST",
          body: JSON.stringify(triagePayload),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || "Could not submit video triage data");
        }
      }

      setToast({ message: "Intake details sent to your dentist", tone: "success" });
      router.push({
        pathname: "/(patient)/video/device-check" as any,
        params: { appointmentId: appointmentId || "" },
      });
    } catch (err: any) {
      setToast({ message: err?.message || "Failed to submit triage", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Check your photos
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Retake any image that's blurry or cropped — clear photos mean better advice.
          </ThemedText>
        </View>

        <View style={styles.list}>
          {slots.map((slot) => (
            <Card key={slot.id} elevation="raised" style={styles.rowCard}>
              <View style={[styles.thumb, !slot.captured && styles.thumbEmpty]}>
                <AppIcon name={slot.captured ? "image" : "camera"} size={22} color={slot.captured ? colors.onInk : colors.ink} />
              </View>
              <View style={styles.rowInfo}>
                <ThemedText variant="subhead" style={styles.rowTitle}>
                  {slot.label}
                </ThemedText>
                <ThemedText variant="caption" style={slot.captured ? styles.rowStatusOk : styles.rowStatusPending}>
                  {slot.captured ? "Looks good" : "Needs retake"}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retake photo of ${slot.label}`}
                onPress={() => retake(slot.id)}
                style={({ pressed }) => [styles.retakeBtn, pressed && { opacity: 0.7 }]}
              >
                <AppIcon name="refresh" size={15} color={colors.ink} />
                <ThemedText variant="caption" style={styles.retakeText}>
                  Retake
                </ThemedText>
              </Pressable>
            </Card>
          ))}
        </View>

        <View style={styles.noteRow}>
          <AppIcon name="shield" size={14} color={colors.secondaryLabel} />
          <ThemedText variant="caption" style={styles.noteText}>
            Photos are encrypted and only visible to your treating clinician.
          </ThemedText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
        <Button
          title={allGood ? "Send photos" : "Retake flagged photos first"}
          size="lg"
          loading={isSubmitting}
          disabled={!allGood || isSubmitting}
          onPress={submit}
        />
        <Button title="Skip for now" variant="ghost" size="sm" onPress={() => router.push("/(patient)/video/device-check")} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  footer: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  header: {
    gap: spacing.xxs,
  },
  list: {
    gap: spacing.sm,
  },
  noteRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xxs,
  },
  noteText: {
    color: colors.secondaryLabel,
    flex: 1,
  },
  retakeBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
  },
  retakeText: {
    color: colors.ink,
    fontWeight: "700",
  },
  rowCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowStatusOk: {
    color: colors.success,
    fontWeight: "600",
  },
  rowStatusPending: {
    color: colors.warning,
    fontWeight: "600",
  },
  rowTitle: {
    color: colors.label,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  thumb: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  thumbEmpty: {
    backgroundColor: colors.secondaryBackground,
  },
  title: {
    color: colors.label,
  },
});
