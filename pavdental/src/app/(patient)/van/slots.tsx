import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button } from "@/components";
import { colors, spacing } from "@/theme";

interface VanSlot {
  id: string;
  timeWindow: string; // Dynamic window with travel buffer
  date: string;
  vanUnit: string;
  travelBufferMinutes: number;
}

export default function VanSlotsScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("Tue 23 Sep");
  const [selectedSlot, setSelectedSlot] = useState<VanSlot | null>(null);

  const dates = ["Tue 23 Sep", "Wed 24 Sep", "Thu 25 Sep"];

  const vanSlots: VanSlot[] = [
    {
      id: "vs_1",
      timeWindow: "09:30 – 11:00 AM",
      date: "Tue 23 Sep",
      vanUnit: "Pav Van #1 (Westminster Route)",
      travelBufferMinutes: 30,
    },
    {
      id: "vs_2",
      timeWindow: "12:00 – 01:30 PM",
      date: "Tue 23 Sep",
      vanUnit: "Pav Van #1 (Westminster Route)",
      travelBufferMinutes: 30,
    },
    {
      id: "vs_3",
      timeWindow: "02:30 – 04:00 PM",
      date: "Tue 23 Sep",
      vanUnit: "Pav Van #1 (Westminster Route)",
      travelBufferMinutes: 30,
    },
  ];

  const handleContinue = () => {
    if (!selectedSlot) return;
    router.push("/(patient)/van/confirm" as any);
  };

  return (
    <View style={styles.container}>
      {/* Date Bar */}
      <View style={styles.dateBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScroll}
        >
          {dates.map((d) => {
            const active = selectedDate === d;
            return (
              <Pressable
                key={d}
                onPress={() => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                style={[styles.datePill, active && styles.datePillActive]}
              >
                <ThemedText
                  variant="caption"
                  style={[styles.dateText, active && styles.dateTextActive]}
                >
                  {d}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="headline" style={styles.title}>
            Travel-Optimized Arrival Windows
          </ThemedText>
          <ThemedText variant="caption" style={styles.subtitle}>
            Slots include a built-in 30-min transit & setup buffer to account for London traffic.
          </ThemedText>
        </View>

        {/* Slot Cards */}
        <View style={styles.slotList}>
          {vanSlots.map((s) => {
            const isSelected = selectedSlot?.id === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSelectedSlot(s)}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <Card
                  elevation="raised"
                  style={[styles.slotCard, isSelected && styles.slotCardSelected]}
                >
                  <View style={styles.slotRow}>
                    <View style={styles.iconCircle}>
                      <ThemedText variant="title">🚐</ThemedText>
                    </View>
                    <View style={styles.slotInfo}>
                      <ThemedText variant="headline" style={styles.windowTime}>
                        {s.timeWindow}
                      </ThemedText>
                      <ThemedText variant="caption" style={styles.unitName}>
                        {s.vanUnit}
                      </ThemedText>
                    </View>
                    <View style={styles.selectRadio}>
                      <ThemedText variant="caption" style={isSelected ? styles.radioSelected : styles.radioUnselected}>
                        {isSelected ? "● Selected" : "○ Select"}
                      </ThemedText>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title={selectedSlot ? `Confirm ${selectedSlot.timeWindow}` : "Choose an arrival window"}
          size="lg"
          disabled={!selectedSlot}
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
  dateBar: {
    backgroundColor: colors.systemBackground,
    borderBottomColor: colors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  datePill: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  datePillActive: {
    backgroundColor: colors.brand,
  },
  dateScroll: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateText: {
    color: colors.label,
    fontWeight: "600",
  },
  dateTextActive: {
    color: colors.onBrand,
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
  iconCircle: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  radioSelected: {
    color: colors.brand,
    fontWeight: "700",
  },
  radioUnselected: {
    color: colors.secondaryLabel,
  },
  selectRadio: {
    alignItems: "flex-end",
  },
  slotCard: {
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderWidth: 1.5,
    padding: spacing.md,
  },
  slotCardSelected: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
  },
  slotInfo: {
    flex: 1,
    gap: 2,
  },
  slotList: {
    gap: spacing.sm,
  },
  slotRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
  unitName: {
    color: colors.secondaryLabel,
  },
  windowTime: {
    color: colors.label,
  },
});

