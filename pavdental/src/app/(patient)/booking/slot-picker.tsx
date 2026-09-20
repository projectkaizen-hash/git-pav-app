import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { useBookingStore } from "@/features/booking/booking-store";
import { TimeSlot } from "@/features/booking/booking-types";

import { useSlots, useHoldSlotMutation } from "@/features/hooks/use-dental-api";

export default function SlotPickerScreen() {
  const router = useRouter();
  const { setSlot, setHoldExpiry, clinician, clinic, service } = useBookingStore();
  const [selectedDate, setSelectedDate] = useState<string>("Mon 22 Sep");
  const [selectedSlot, setSelectedSlotState] = useState<TimeSlot | null>(null);

  const dates = ["Mon 22 Sep", "Tue 23 Sep", "Wed 24 Sep", "Thu 25 Sep"];

  // Format "Mon 22 Sep" to "2026-09-22"
  const dateMap: Record<string, string> = {
    "Mon 22 Sep": "2026-09-22",
    "Tue 23 Sep": "2026-09-23",
    "Wed 24 Sep": "2026-09-24",
    "Thu 25 Sep": "2026-09-25",
  };

  const isoDate = dateMap[selectedDate] || "2026-09-22";

  const { data: apiSlots } = useSlots({
    date: isoDate,
    clinicianId: clinician?.id,
    serviceId: service?.id,
  });

  const slots = apiSlots || [];

  const filteredSlots = slots.filter((slot) => {
    if (slot.dateFormatted && slot.dateFormatted !== selectedDate) return false;
    if (clinician && slot.clinicianId && slot.clinicianId !== clinician.id) return false;
    if (clinic && slot.clinicId && slot.clinicId !== clinic.id) return false;
    return slot.isAvailable;
  });

  const holdMutation = useHoldSlotMutation();

  const handleContinue = async () => {
    if (!selectedSlot) return;
    setSlot(selectedSlot);

    // Call Redis slot hold API
    try {
      const res = await holdMutation.mutateAsync(selectedSlot.id);
      setHoldExpiry(res.holdExpiresAt);
    } catch {
      // 10-minute fallback TTL if offline
      setHoldExpiry(Date.now() + 10 * 60 * 1000);
    }

    router.push("/(patient)/booking/summary" as any);
  };

  return (
    <View style={styles.container}>
      {/* Date Selector Row */}
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
                  setSelectedSlotState(null);
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

      {/* Available Slot Grid */}
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText variant="headline" style={styles.sectionHeader}>
          Available Times for {selectedDate}
        </ThemedText>

        {filteredSlots.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="body" style={styles.emptyText}>
              No available slots for this date. Please check the next day or choose 'Any Practitioner'.
            </ThemedText>
          </Card>
        ) : (
          <View style={styles.slotGrid}>
            {filteredSlots.map((slot) => {
              const selected = selectedSlot?.id === slot.id;
              return (
                <Pressable
                  key={slot.id}
                  onPress={() => setSelectedSlotState(slot)}
                  style={[styles.slotItem, selected && styles.slotItemSelected]}
                >
                  <ThemedText
                    variant="headline"
                    style={[styles.slotTime, selected && styles.slotTimeSelected]}
                  >
                    {slot.displayTime}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.footerBar}>
        <Button
          title={selectedSlot ? `Confirm ${selectedSlot.displayTime}` : "Choose a time slot"}
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
    paddingBottom: spacing.xxxl,
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
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  footerBar: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  sectionHeader: {
    color: colors.label,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  slotItem: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    paddingVertical: spacing.md,
    width: "31%",
  },
  slotItemSelected: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
  },
  slotTime: {
    color: colors.label,
  },
  slotTimeSelected: {
    color: colors.brand,
    fontWeight: "700",
  },
});

