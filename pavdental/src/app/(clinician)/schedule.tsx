import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Badge, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { useMyAppointments } from "@/features/hooks/use-dental-api";
import { useCurrentUser } from "@/features/auth/auth-store";

export default function ClinicianScheduleScreen() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { data: liveAppointments } = useMyAppointments();

  const clinicianName = currentUser?.firstName
    ? `Dr. ${currentUser.firstName} ${currentUser.lastName}`
    : "Dr. Tariq Pav";

  const defaultSessions = [
    {
      id: "cs_1",
      time: "10:00 – 10:15 AM",
      type: "video",
      patientName: "Sarah Jenkins (34y)",
      chiefComplaint: "Severe LR7 throbbing pain upon cold liquids",
      photosAttached: 4,
      status: "ready_to_connect",
    },
    {
      id: "cs_2",
      time: "10:30 – 11:00 AM",
      type: "clinic",
      patientName: "David Miller (48y)",
      chiefComplaint: "Routine 6-Month Scale & Polish + Bite Exam",
      photosAttached: 0,
      status: "scheduled",
    },
    {
      id: "cs_3",
      time: "11:30 – 12:15 PM",
      type: "clinic",
      patientName: "Emily Watson (29y)",
      chiefComplaint: "Composite Restoration Tooth #14 (MOD)",
      photosAttached: 2,
      status: "scheduled",
    },
  ];

  const sessions = (liveAppointments && liveAppointments.length > 0)
    ? liveAppointments.map((a: any) => ({
        id: a.id,
        time: new Date(a.startTimeUtc).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        type: a.channel || "video",
        patientName: a.patient
          ? `${a.patient.firstName} ${a.patient.lastName}`
          : (a.patientName || "Verified Patient"),
        chiefComplaint: a.service?.name || a.serviceName || "Dental Consultation",
        photosAttached: a.intraoralPhotos?.length || 0,
        status: a.status === "confirmed" ? "ready_to_connect" : a.status,
      }))
    : defaultSessions;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Clinician Header */}
        <View style={styles.header}>
          <View style={styles.docRow}>
            <View style={styles.avatar}>
              <ThemedText variant="title" style={styles.avatarText}>
                {clinicianName.split(" ").pop()?.[0] || "D"}
              </ThemedText>
            </View>
            <View style={styles.docInfo}>
              <ThemedText variant="headline" style={styles.docName}>
                {clinicianName}
              </ThemedText>
              <ThemedText variant="caption" style={styles.docSub}>
                GDC #248912 · Principal Dental Surgeon
              </ThemedText>
            </View>
          </View>
          <Badge label="Clinical Duty Active" variant="success" />
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Today's Consultations & Visits ({sessions.length} Patient{sessions.length !== 1 ? "s" : ""})
          </ThemedText>

          <View style={styles.sessionList}>
            {sessions.map((s: any) => {
              const isVideo = s.type === "video";
              const isReady = s.status === "ready_to_connect";
              return (
                <Card
                  key={s.id}
                  elevation="raised"
                  style={[styles.card, isReady && styles.cardReady]}
                >
                  <View style={styles.cardTop}>
                    <Badge
                      label={isVideo ? "VIDEO CONSULT" : "IN-CLINIC"}
                      variant={isVideo ? "info" : "default"}
                    />
                    <ThemedText variant="headline" style={styles.timeVal}>
                      {s.time}
                    </ThemedText>
                  </View>

                  <View style={styles.patientBlock}>
                    <ThemedText variant="headline" style={styles.patientName}>
                      {s.patientName}
                    </ThemedText>
                    <ThemedText variant="caption" style={styles.complaint}>
                      🦷 {s.chiefComplaint}
                    </ThemedText>
                    {s.photosAttached > 0 ? (
                      <ThemedText variant="caption" style={styles.photoTag}>
                        📸 {s.photosAttached} Intraoral photos submitted
                      </ThemedText>
                    ) : null}
                  </View>

                  {isReady ? (
                    <View style={styles.actionRow}>
                      <Button
                        title="Open Video Consult Room ›"
                        size="md"
                        onPress={() =>
                          router.push({
                            pathname: "/(clinician)/consult-room" as any,
                            params: {
                              appointmentId: s.id,
                              patientName: s.patientName,
                              chiefComplaint: s.chiefComplaint,
                            },
                          })
                        }
                      />
                    </View>
                  ) : null}
                </Card>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.brandSubtle,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: colors.brand,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardReady: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  complaint: {
    color: colors.secondaryLabel,
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
  docInfo: {
    gap: 2,
  },
  docName: {
    color: colors.label,
  },
  docRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  docSub: {
    color: colors.secondaryLabel,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  patientBlock: {
    gap: 4,
    marginTop: spacing.xxs,
  },
  patientName: {
    color: colors.label,
  },
  photoTag: {
    color: colors.brand,
    fontWeight: "600",
    marginTop: 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.label,
  },
  sessionList: {
    gap: spacing.md,
  },
  timeVal: {
    color: colors.brand,
  },
});
