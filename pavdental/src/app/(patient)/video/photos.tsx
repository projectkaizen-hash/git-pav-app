import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Button } from "@/components";
import { colors, spacing } from "@/theme";

interface PhotoSlot {
  id: string;
  label: string;
  description: string;
  isCaptured: boolean;
}

export default function IntraoralPhotosScreen() {
  const router = useRouter();
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>([
    {
      id: "front",
      label: "1. Front Teeth (Bite Closed)",
      description: "Smile showing front top and bottom teeth together.",
      isCaptured: true,
    },
    {
      id: "affected",
      label: "2. Affected Area / Pain Area",
      description: "Close-up photo of the hurting tooth, filling or gum.",
      isCaptured: true,
    },
    {
      id: "upper",
      label: "3. Upper Arch (Roof of Mouth)",
      description: "Tilt head back, mouth open wide showing top teeth.",
      isCaptured: false,
    },
    {
      id: "lower",
      label: "4. Lower Arch (Floor of Mouth)",
      description: "Tilt chin down, tongue relaxed behind front teeth.",
      isCaptured: false,
    },
  ]);

  const toggleCapture = (id: string) => {
    setPhotoSlots((prev) =>
      prev.map((slot) =>
        slot.id === id ? { ...slot, isCaptured: !slot.isCaptured } : slot
      )
    );
  };

  const handleContinue = () => {
    router.push("/(patient)/video/device-check" as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="headline" style={styles.title}>
            Guided Dental Photos
          </ThemedText>
          <ThemedText variant="caption" style={styles.subtitle}>
            Clear photos help your dentist diagnose issues and prescribe antibiotics or pain relief before surgery.
          </ThemedText>
        </View>

        {/* Tip Banner */}
        <View style={styles.tipBox}>
          <ThemedText variant="caption" style={styles.tipText}>
            💡 <ThemedText variant="caption" style={styles.tipBold}>Tip:</ThemedText> Use your smartphone's camera flash or stand near natural window light.
          </ThemedText>
        </View>

        {/* Photo Slots */}
        <View style={styles.slotList}>
          {photoSlots.map((slot) => (
            <Pressable
              key={slot.id}
              onPress={() => toggleCapture(slot.id)}
              style={[styles.slotCard, slot.isCaptured && styles.slotCardCaptured]}
            >
              <View style={styles.thumbnailBox}>
                <ThemedText variant="title">
                  {slot.isCaptured ? "📸" : "➕"}
                </ThemedText>
              </View>
              <View style={styles.slotInfo}>
                <ThemedText variant="headline" style={styles.slotLabel}>
                  {slot.label}
                </ThemedText>
                <ThemedText variant="caption" style={styles.slotDesc}>
                  {slot.description}
                </ThemedText>
              </View>
              <View style={styles.statusBox}>
                <ThemedText variant="caption" style={slot.isCaptured ? styles.statusDone : styles.statusPending}>
                  {slot.isCaptured ? "Captured" : "Tap to Take"}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Continue to Device Check ›"
          size="lg"
          onPress={handleContinue}
        />
        <Button
          title="Skip Photo Step"
          variant="ghost"
          size="sm"
          onPress={handleContinue}
        />
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
  slotCard: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  slotCardCaptured: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
  },
  slotDesc: {
    color: colors.secondaryLabel,
    lineHeight: 16,
  },
  slotInfo: {
    flex: 1,
    gap: 2,
  },
  slotLabel: {
    color: colors.label,
  },
  slotList: {
    gap: spacing.sm,
  },
  statusBox: {
    alignItems: "flex-end",
  },
  statusDone: {
    color: colors.brand,
    fontWeight: "700",
  },
  statusPending: {
    color: colors.secondaryLabel,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  thumbnailBox: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  tipBold: {
    color: colors.info,
    fontWeight: "700",
  },
  tipBox: {
    backgroundColor: colors.infoSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  tipText: {
    color: colors.info,
  },
  title: {
    color: colors.label,
  },
});

