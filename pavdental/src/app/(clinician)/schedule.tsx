import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Badge, Button, AppIcon, EmptyState } from "@/components";
import { colors, spacing } from "@/theme";
import { useMyAppointments } from "@/features/hooks/use-dental-api";
import { useCurrentUser, useAuthStore } from "@/features/auth/auth-store";

export default function ClinicianScheduleScreen() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { data: liveAppointments } = useMyAppointments();

  const clinicianName = currentUser?.firstName
    ? `Dr. ${currentUser.firstName} ${currentUser.lastName}`
    : "Clinician";

  const sessions = (liveAppointments && liveAppointments.length > 0)
    ? liveAppointments.map((a: any) => ({
        id: a.id,
        time: new Date(a.startTimeUtc).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        type: a.channel || "video",
        patientName: a.patient
          ? `${a.patient.firstName} ${a.patient.lastName}${a.patient.age ? ` (${a.patient.age}y)` : ""}`
          : (a.patientName || "Verified Patient"),
        chiefComplaint: a.service?.name || a.serviceName || "Dental Consultation",
        photosAttached: a.intraoralPhotos?.length || 0,
        status: a.status === "confirmed" ? "ready_to_connect" : a.status,
      }))
    : [];

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
            </View>
          </View>
          <Badge label="Clinical Duty Active" variant="success" />
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Today's Consultations & Visits ({sessions.length} Patient{sessions.length !== 1 ? "s" : ""})
          </ThemedText>

          {sessions.length === 0 ? (
            <EmptyState
              heading="No consultations scheduled"
              body="Appointments booked by patients will appear here."
              icon="calendar"
            />
          ) : (
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
                        {s.chiefComplaint}
                      </ThemedText>
                      {s.photosAttached > 0 ? (
                        <View style={styles.photoTagRow}>
                          <AppIcon name="camera" size={12} color={colors.secondaryLabel} />
                          <ThemedText variant="caption" style={styles.photoTag}>
                            {s.photosAttached} intraoral photos submitted
                          </ThemedText>
                        </View>
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
          )}
        </View>

        {/* Portal Role Switcher for Simulator Verification (development opt-in only) */}
        {__DEV__ && process.env.EXPO_PUBLIC_ENABLE_ROLE_SWITCHER === "true" ? (
          <Card elevation="raised" style={styles.roleCard}>
            <ThemedText variant="caption" style={styles.roleHint}>
              🔄 Switch Mobile Portal (Demo Verification)
            </ThemedText>
            <View style={styles.roleBtnRow}>
              <Button
                title="‹ Patient Portal"
                variant="secondary"
                size="sm"
                onPress={() => {
                  useAuthStore.getState().updateUser({
                    role: "patient",
                    email: "monika@pavdental.com",
                    firstName: "Monika",
                    lastName: "Grabowska",
                  });
                  router.replace("/(patient)/(tabs)/home" as any);
                }}
              />
              <Button
                title="Operator Van ›"
                variant="secondary"
                size="sm"
                onPress={() => {
                  useAuthStore.getState().updateUser({
                    role: "operator",
                    email: "van@pavdental.com",
                    firstName: "Dave",
                    lastName: "Miller",
                  });
                  router.replace("/(operator)/route" as any);
                }}
              />
            </View>
          </Card>
        ) : null}
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
    backgroundColor: colors.inkSubtle,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: colors.ink,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardReady: {
    borderColor: colors.ink,
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
  photoTagRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  photoTag: {
    color: colors.ink,
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
    color: colors.ink,
  },
  roleCard: {
    backgroundColor: colors.secondaryBackground,
    borderCurve: "continuous",
    borderColor: colors.separator,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  roleHint: {
    color: colors.secondaryLabel,
    fontWeight: "600",
  },
  roleBtnRow: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
});
