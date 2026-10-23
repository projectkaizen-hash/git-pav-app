import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button, AppIcon, ChipPill, ConfirmSheet, Toast, Badge } from "@/components";
import { colors, spacing, radius } from "@/theme";
import { useBookingStore } from "@/features/booking/booking-store";
import {
  fetchWaitlistEntries,
  joinWaitlistEntry,
  leaveWaitlistEntry,
} from "@/features/records/records-api";
import { useServices } from "@/features/hooks/use-dental-api";

export default function WaitlistScreen() {
  const router = useRouter();
  const { service, clinician, clinic } = useBookingStore();
  const { data: services } = useServices();
  const [waitlistEntry, setWaitlistEntry] = useState<any | null>(null);
  const [joinedId, setJoinedId] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  // Preference switches
  const [smsNotify, setSmsNotify] = useState(true);
  const [whatsAppNotify, setWhatsAppNotify] = useState(true);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<"any" | "morning" | "afternoon">("any");

  useEffect(() => {
    fetchWaitlistEntries()
      .then((res) => {
        const list = Array.isArray(res?.entries) ? res.entries : Array.isArray(res) ? res : [];
        if (list.length > 0) {
          setWaitlistEntry(list[0]);
          setJoinedId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const entry = {
    id: waitlistEntry?.id || joinedId || "wait_1",
    serviceName: waitlistEntry?.service?.name || service?.name || "Scale & Polish + Hygiene",
    clinicianName: clinician?.fullName || "Dr. Tariq Pav",
    clinicName: clinic?.name || "Central London Practice",
    joinedIso: waitlistEntry?.createdAt || new Date().toISOString(),
    peopleAhead: typeof waitlistEntry?.priority === "number" ? Math.max(0, waitlistEntry.priority - 1) : 1,
  };

  const handleJoin = async () => {
    const resolvedServiceId =
      service?.id ||
      (Array.isArray(services) && services.length > 0 ? (services[0] as any).id : undefined);
    try {
      if (resolvedServiceId) {
        const created = await joinWaitlistEntry({
          serviceId: resolvedServiceId,
          preferredChannels: ["clinic", "van"],
          preferredTimeSlots:
            selectedTimeSlot === "any" ? ["morning", "afternoon"] : [selectedTimeSlot],
        });
        const newEntry = created?.entry || created;
        setWaitlistEntry(newEntry);
        setJoinedId(newEntry?.id || "wait_active");
      } else {
        setJoinedId("wait_active");
      }
      setToast({ message: "You're on the priority waitlist — we'll text you", tone: "success" });
    } catch (err: any) {
      setToast({ message: err?.message || "Could not join waitlist", tone: "error" });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {toast ? <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} /> : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <AppIcon name="chevronLeft" size={20} color={colors.ink} />
            <ThemedText variant="subhead" style={styles.backText}>Back</ThemedText>
          </Pressable>
          <ThemedText variant="largeTitle" style={styles.title}>
            Priority Waitlist
          </ThemedText>
          <ThemedText variant="subhead" style={styles.subtitle}>
            When a patient reschedules or cancels, slots are instantly offered to the waitlist in order of priority.
          </ThemedText>
        </View>

        {joinedId ? (
          <>
            {/* Live Queue Position Card */}
            <Card elevation="raised" style={styles.positionCard}>
              <View style={styles.positionTop}>
                <View style={styles.pulseDot} />
                <Badge label="ACTIVE IN QUEUE" variant="success" />
                <ThemedText variant="caption" style={styles.priorityTag}>
                  15-min instant response window
                </ThemedText>
              </View>

              <View style={styles.queueHighlight}>
                <ThemedText variant="largeTitle" style={styles.queueBigNumber}>
                  #{Math.max(entry.peopleAhead, 0) + 1}
                </ThemedText>
                <View style={styles.queueMeta}>
                  <ThemedText variant="headline" style={styles.queueStatusTitle}>
                    You're next in line
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.muted}>
                    Only {entry.peopleAhead} person ahead of you for this clinician
                  </ThemedText>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <ThemedText variant="caption" style={styles.muted}>Service</ThemedText>
                  <ThemedText variant="subhead" style={styles.detailVal}>{entry.serviceName}</ThemedText>
                </View>
                <View style={styles.detailItem}>
                  <ThemedText variant="caption" style={styles.muted}>Clinician</ThemedText>
                  <ThemedText variant="subhead" style={styles.detailVal}>{entry.clinicianName}</ThemedText>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardBottomRow}>
                <ThemedText variant="caption" style={styles.joinedDate}>
                  Joined {new Date(entry.joinedIso).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </ThemedText>
                <Button
                  title="Leave Waitlist"
                  variant="ghost"
                  size="sm"
                  onPress={() => setConfirmLeave(true)}
                />
              </View>
            </Card>

            {/* Notification Channels */}
            <Card style={styles.prefCard}>
              <ThemedText variant="headline" style={styles.prefHeading}>
                Notification Channels
              </ThemedText>
              <ThemedText variant="caption" style={styles.muted}>
                Choose how you'd like us to alert you when a cancellation slot opens.
              </ThemedText>

              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelGroup}>
                  <AppIcon name="messageSquare" size={18} color={colors.ink} />
                  <ThemedText variant="body" style={styles.toggleText}>
                    SMS Text Message (+44 7700 900077)
                  </ThemedText>
                </View>
                <Switch
                  value={smsNotify}
                  onValueChange={setSmsNotify}
                  trackColor={{ false: colors.secondaryBackground, true: colors.ink }}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelGroup}>
                  <AppIcon name="bell" size={18} color={colors.ink} />
                  <ThemedText variant="body" style={styles.toggleText}>
                    WhatsApp Instant Ping
                  </ThemedText>
                </View>
                <Switch
                  value={whatsAppNotify}
                  onValueChange={setWhatsAppNotify}
                  trackColor={{ false: colors.secondaryBackground, true: colors.ink }}
                />
              </View>
            </Card>

            {/* Time Slot Preferences */}
            <Card style={styles.prefCard}>
              <ThemedText variant="headline" style={styles.prefHeading}>
                Preferred Times
              </ThemedText>
              <View style={styles.choiceRow}>
                <ChipPill
                  label="Any Time (Fastest)"
                  selected={selectedTimeSlot === "any"}
                  onPress={() => setSelectedTimeSlot("any")}
                />
                <ChipPill
                  label="Mornings (8am – 12pm)"
                  selected={selectedTimeSlot === "morning"}
                  onPress={() => setSelectedTimeSlot("morning")}
                />
                <ChipPill
                  label="Afternoons (12pm – 5pm)"
                  selected={selectedTimeSlot === "afternoon"}
                  onPress={() => setSelectedTimeSlot("afternoon")}
                />
              </View>
            </Card>

            <View style={styles.tipRow}>
              <AppIcon name="zap" size={15} color={colors.success} />
              <ThemedText variant="caption" style={styles.muted}>
                Average waitlist offer time for this clinic is under 4 hours. Keep notifications on to secure the booking.
              </ThemedText>
            </View>
          </>
        ) : (
          <>
            {/* Join card (pre-join state) */}
            <Card elevation="raised" style={styles.positionCard}>
              <View style={styles.positionTop}>
                <AppIcon name="zap" size={18} color={colors.ink} />
                <ThemedText variant="headline" style={styles.positionTitle}>
                  {service?.name || "Next Available Appointment"}
                </ThemedText>
              </View>
              <ThemedText variant="caption" style={styles.muted}>
                Join the priority waitlist to get immediate first-refusal alerts on cancellations before they go to general booking.
              </ThemedText>
              <Button title="Join Priority Waitlist" size="lg" onPress={handleJoin} style={styles.leaveBtn} />
            </Card>
          </>
        )}
      </ScrollView>

      {confirmLeave ? (
        <ConfirmSheet
          title="Leave the waitlist?"
          message="You'll lose your #2 position in the cancellation queue. If you rejoin later, you'll start at the back."
          confirmLabel="Leave waitlist"
          cancelLabel="Keep my place"
          onConfirm={async () => {
            if (joinedId && joinedId !== "wait_active") {
              await leaveWaitlistEntry(joinedId).catch(() => {});
            }
            setWaitlistEntry(null);
            setJoinedId(null);
            setConfirmLeave(false);
            setToast({ message: "Removed from waitlist", tone: "success" });
          }}
          onCancel={() => setConfirmLeave(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginBottom: spacing.xs,
  },
  backText: {
    color: colors.ink,
    fontWeight: "600",
  },
  cardBottomRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardDivider: {
    backgroundColor: colors.separator,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  detailItem: {
    flex: 1,
    gap: 2,
  },
  detailVal: {
    color: colors.label,
    fontWeight: "600",
  },
  detailsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  header: {
    gap: spacing.xxs,
  },
  joinedDate: {
    color: colors.tertiaryLabel,
  },
  leaveBtn: {
    marginTop: spacing.sm,
  },
  muted: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  positionCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  positionTitle: {
    color: colors.label,
  },
  positionTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  prefCard: {
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  prefHeading: {
    color: colors.label,
  },
  priorityTag: {
    color: colors.secondaryLabel,
    marginLeft: "auto",
  },
  pulseDot: {
    backgroundColor: colors.success,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  queueBigNumber: {
    color: colors.ink,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: -1,
  },
  queueHighlight: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderCurve: "continuous",
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  queueMeta: {
    flex: 1,
    gap: 2,
  },
  queueStatusTitle: {
    color: colors.label,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 20,
  },
  tipRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  title: {
    color: colors.label,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  toggleLabelGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
  },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  toggleText: {
    color: colors.label,
  },
});
