import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText, Card, Button, ProgressPills, ChipPill, Toast } from "@/components";
import { colors, spacing } from "@/theme";
import { useBookingStore } from "@/features/booking/booking-store";
import { TimeSlot } from "@/features/booking/booking-types";
import { useSlots, useHoldSlotMutation } from "@/features/hooks/use-dental-api";
import { ukDayLabel, ukHour, upcomingUkDates } from "@/features/booking/uk-time";

export default function SlotPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setSlot, setHoldExpiry, clinician, clinic, service, channel } = useBookingStore();

  // Days and times are the clinic's, in UK time.
  const upcomingDays = useMemo(
    () => upcomingUkDates(7).map((iso) => ({ iso, label: ukDayLabel(iso) })),
    []
  );

  const [selectedDate, setSelectedDate] = useState<string>(upcomingDays[0].label);
  const [selectedSlot, setSelectedSlotState] = useState<TimeSlot | null>(null);
  const [partOfDay, setPartOfDay] = useState<"any" | "am" | "pm">("any");
  const [holdError, setHoldError] = useState<string | null>(null);

  const dates = upcomingDays.map((d) => d.label);
  const isoDate =
    upcomingDays.find((d) => d.label === selectedDate)?.iso ?? upcomingDays[0].iso;

  const { data: apiSlots } = useSlots({
    date: isoDate,
    channel: channel ?? "clinic",
    clinicId: clinic?.id,
    clinicianId: clinician?.id,
    serviceId: service?.id,
  });

  const slots: TimeSlot[] = (apiSlots ?? []) as TimeSlot[];

  const filteredSlots = slots.filter((slot) => {
    if (slot.dateFormatted && slot.dateFormatted !== selectedDate) return false;
    if (clinician && slot.clinicianId && slot.clinicianId !== clinician.id) return false;
    if (clinic && slot.clinicId && slot.clinicId !== clinic.id) return false;
    return slot.isAvailable;
  });

  const hourOf = (slot: TimeSlot) => {
    const iso = (slot as any).startTimeUtc || (slot as any).start_time_utc;
    if (iso) return ukHour(new Date(iso));
    const [h] = String(slot.displayTime || "").split(":");
    return Number(h) || 0;
  };

  const visibleSlots = filteredSlots.filter((slot) => {
    if (partOfDay === "am") return hourOf(slot) < 12;
    if (partOfDay === "pm") return hourOf(slot) >= 12;
    return true;
  });

  const soonestSlot = visibleSlots.length
    ? [...visibleSlots].sort((a, b) => hourOf(a) - hourOf(b))[0]
    : null;

  const holdMutation = useHoldSlotMutation();

  const handleContinue = async () => {
    if (!selectedSlot) return;
    setHoldError(null);
    setSlot(selectedSlot);

    // Call Redis slot hold API
    try {
      const res = await holdMutation.mutateAsync(selectedSlot.id);
      setHoldExpiry(res.holdExpiresAt);
      router.push("/(patient)/booking/summary" as any);
    } catch (err: any) {
      setHoldError(err?.message || "Could not reserve this slot. Please try another time.");
    }
  };

  return (
    <View style={styles.container}>
      {holdError ? (
        <Toast
          message={holdError}
          tone="error"
          onDismiss={() => setHoldError(null)}
        />
      ) : null}
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
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setSelectedDate(d);
                  setSelectedSlotState(null);
                }}
                style={({ pressed }) => [
                  styles.datePill,
                  active && styles.datePillActive,
                  pressed && { opacity: 0.8 },
                ]}
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
        <ProgressPills total={5} current={4} />

        {/* Quick-pick chips (Zocdoc "soonest / part of day" pattern) */}
        <View style={styles.quickRow}>
          <ChipPill
            label="Soonest available"
            tone="ink"
            selected={!!selectedSlot && selectedSlot.id === soonestSlot?.id}
            onPress={() => {
              setPartOfDay("any");
              if (soonestSlot) setSelectedSlotState(soonestSlot);
            }}
          />
          <ChipPill
            label="Morning"
            selected={partOfDay === "am"}
            onPress={() => {
              setPartOfDay(partOfDay === "am" ? "any" : "am");
              setSelectedSlotState(null);
            }}
          />
          <ChipPill
            label="Afternoon"
            selected={partOfDay === "pm"}
            onPress={() => {
              setPartOfDay(partOfDay === "pm" ? "any" : "pm");
              setSelectedSlotState(null);
            }}
          />
        </View>

        <ThemedText variant="headline" style={styles.sectionHeader}>
          Available Times for {selectedDate}
        </ThemedText>

        {visibleSlots.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="body" style={styles.emptyText}>
              No available slots for this date. Please check the next day or choose 'Any Practitioner'.
            </ThemedText>
          </Card>
        ) : (
          <View style={styles.slotGrid}>
            {visibleSlots.map((slot) => {
              const selected = selectedSlot?.id === slot.id;
              return (
                <Pressable
                  key={slot.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Appointment at ${slot.displayTime}`}
                  onPress={() => setSelectedSlotState(slot)}
                  style={({ pressed }) => [
                    styles.slotItem,
                    selected && styles.slotItemSelected,
                    pressed && { opacity: 0.85 },
                  ]}
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
      <View style={[styles.footerBar, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
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
    backgroundColor: colors.ink,
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
    color: colors.onInk,
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
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
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
    backgroundColor: colors.inkSubtle,
    borderColor: colors.ink,
  },
  slotTime: {
    color: colors.label,
  },
  slotTimeSelected: {
    color: colors.ink,
    fontWeight: "700",
  },
});

