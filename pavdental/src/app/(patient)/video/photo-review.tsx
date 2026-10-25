import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText, Card, Button, AppIcon, Toast } from '@/components';
import { colors, spacing, radius } from '@/theme';
import { authFetch } from '@/features/auth/auth-api';

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
    photos?: string;
  }>();
  const appointmentId = params.appointmentId;
  // Photos picked on the previous screen, keyed by slot id.
  const picked: Record<string, string> = (() => {
    try {
      return JSON.parse(params.photos || '{}');
    } catch {
      return {};
    }
  })();
  const [slots, setSlots] = useState<ReviewSlot[]>([
    {
      id: 'front',
      label: 'Front teeth (bite closed)',
      captured: !!picked.front,
      uri: picked.front,
    },
    {
      id: 'affected',
      label: 'Affected / painful area',
      captured: !!picked.affected,
      uri: picked.affected,
    },
    { id: 'upper', label: 'Upper arch', captured: !!picked.upper, uri: picked.upper },
    { id: 'lower', label: 'Lower arch', captured: !!picked.lower, uri: picked.lower },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const retake = async (id: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setSlots((prev) =>
          prev.map((s) => (s.id === id ? { ...s, captured: true, uri: result.assets[0].uri } : s))
        );
        setToast({ message: 'Photo updated', tone: 'success' });
        return;
      }
    } catch {
      // No photo library available: the slot keeps what it had.
    }
  };

  const submit = async (withPhotos: boolean) => {
    if (!appointmentId) {
      setToast({
        message: "We couldn't find this consultation. Go back and open it from your appointments.",
        tone: 'error',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      // Upload the photos the patient added
      const uploadedPhotoUrls: string[] = [];
      let failedUploads = 0;
      for (const slot of withPhotos ? slots : []) {
        if (slot.captured && slot.uri) {
          try {
            const formData = new FormData();
            formData.append('photo', {
              uri: slot.uri,
              name: `triage-${slot.id}.jpg`,
              type: 'image/jpeg',
            } as any);
            formData.append('appointmentId', appointmentId);
            formData.append('slotLabel', slot.label);

            const uploadRes = await authFetch('/api/video/upload-triage-photo', {
              method: 'POST',
              body: formData,
            });
            const uploadJson = uploadRes.ok ? await uploadRes.json().catch(() => ({})) : {};
            if (uploadJson.url) {
              uploadedPhotoUrls.push(uploadJson.url);
            } else {
              failedUploads += 1;
            }
          } catch {
            failedUploads += 1;
          }
        }
      }
      if (failedUploads > 0) {
        throw new Error(
          failedUploads === 1
            ? "One photo didn't upload. Try again, or send without photos."
            : `${failedUploads} photos didn't upload. Try again, or send without photos.`
        );
      }

      const chiefComplaint = params.symptomText?.trim() || 'Intake triage review';
      const painLevelNum = Number.isInteger(Number(params.painLevel))
        ? Math.max(0, Math.min(10, Number(params.painLevel)))
        : 5;
      const symptomsList: string[] = [];
      if (params.symptomText?.trim()) symptomsList.push(params.symptomText.trim());
      if (params.hasSwelling === 'true') symptomsList.push('Swelling');

      const triagePayload: Record<string, unknown> = {
        appointmentId,
        chiefComplaint,
        painLevel: painLevelNum,
      };
      if (params.duration?.trim()) triagePayload.duration = params.duration.trim();
      if (symptomsList.length > 0) triagePayload.symptoms = symptomsList;
      if (uploadedPhotoUrls.length > 0) triagePayload.photos = uploadedPhotoUrls;

      const res = await authFetch('/api/video/submit-triage', {
        method: 'POST',
        body: JSON.stringify(triagePayload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Could not submit video triage data');
      }

      setToast({ message: 'Sent to your dentist', tone: 'success' });
      router.push({
        pathname: '/(patient)/video/device-check' as any,
        params: { appointmentId: appointmentId || '' },
      });
    } catch (err: any) {
      setToast({ message: err?.message || 'Failed to submit triage', tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="largeTitle" style={styles.title}>
            Check your photos
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            Add or replace any photo that's missing, blurry or cropped. Photos are optional.
          </ThemedText>
        </View>

        <View style={styles.list}>
          {slots.map((slot) => (
            <Card key={slot.id} style={styles.rowCard}>
              <View style={[styles.thumb, !slot.captured && styles.thumbEmpty]}>
                <AppIcon
                  name={slot.captured ? 'image' : 'camera'}
                  size={22}
                  color={slot.captured ? colors.onInk : colors.ink}
                />
              </View>
              <View style={styles.rowInfo}>
                <ThemedText variant="subhead" style={styles.rowTitle}>
                  {slot.label}
                </ThemedText>
                <ThemedText
                  variant="caption"
                  style={slot.captured ? styles.rowStatusOk : styles.rowStatusPending}
                >
                  {slot.captured ? 'Added' : 'Not added'}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${slot.captured ? 'Replace' : 'Add'} photo of ${slot.label}`}
                onPress={() => retake(slot.id)}
                style={({ pressed }) => [styles.retakeBtn, pressed && { opacity: 0.7 }]}
              >
                <AppIcon name="refresh" size={15} color={colors.ink} />
                <ThemedText variant="caption" style={styles.retakeText}>
                  {slot.captured ? 'Replace' : 'Add'}
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
          title={slots.some((s) => s.captured) ? 'Send to your dentist' : 'Send without photos'}
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting}
          onPress={() => submit(true)}
        />
        {slots.some((s) => s.captured) ? (
          <Button
            title="Send without photos"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onPress={() => submit(false)}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
  },
  footer: {
    backgroundColor: colors.background,
    gap: spacing.xs,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
  },
  header: {
    gap: spacing.xxs,
  },
  list: {
    gap: spacing.sm,
  },
  noteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xxs,
  },
  noteText: {
    color: colors.secondaryLabel,
    flex: 1,
  },
  retakeBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  retakeText: {
    color: colors.ink,
    fontWeight: '700',
  },
  rowCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowStatusOk: {
    color: colors.success,
    fontWeight: '600',
  },
  rowStatusPending: {
    color: colors.warning,
    fontWeight: '600',
  },
  rowTitle: {
    color: colors.label,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  thumbEmpty: {
    backgroundColor: colors.inkSubtle,
  },
  title: {
    color: colors.label,
  },
});
