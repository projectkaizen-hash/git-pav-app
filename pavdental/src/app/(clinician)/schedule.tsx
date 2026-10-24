import React from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Badge, Button, AppIcon, EmptyState } from "@/components";
import { colors, spacing } from "@/theme";
import { useMyAppointments } from "@/features/hooks/use-dental-api";
import { useCurrentUser, useAuthStore } from "@/features/auth/auth-store";

export default function ClinicianScheduleScreen() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { data: liveAppointments, isLoading, error, refetch } = useMyAppointments();

  // MB-4: Prevent "Dr. Dr." double prefix
  const rawFirst = currentUser?.firstName || "";
  const rawLast = currentUser?.lastName || "";
  const hasDr = rawFirst.toLowerCase().startsWith("dr.") || rawFirst.toLowerCase().startsWith("dr ");
  const clinicianName = rawFirst
    ? hasDr
      ? `${rawFirst} ${rawLast}`.trim()
      : `Dr. ${rawFirst} ${rawLast}`.trim()
    : "Clinician";

  // MB-4: Real GDC number and role title
  const gdcText = currentUser?.gdcNumber
    ? `GDC #${currentUser.gdcNumber} · ${currentUser?.roleTitle || "Dental Surgeon"}`
    : currentUser?.roleTitle || "Dental Practitioner";

  const sessions = (liveAppointments && liveAppointments.length > 0)
    ? liveAppointments.map((a: any) => ({
        id: a.id,
        patientId: a.patientId || a.patient?.id,
        time: new Date(a.startTimeUtc).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        type: a.channel || "video",
        // A child booked by their guardian is the one being seen.
        patientName: a.dependant
          ? `${a.dependant.firstName} ${a.dependant.lastName} (${a.dependant.age}y)${a.patient ? `, with ${a.patient.firstName} ${a.patient.lastName}` : ""}`
          : a.patient
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
        {/* Clinician Header (MB-4: No clipping at 320/375px) */}
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
              <ThemedText variant="caption" style={styles.gdcSubtext}>
                {gdcText}
              </ThemedText>
            </View>
          </View>
          <View style={styles.badgeWrapper}>
            <Badge label="Clinical Duty Active" variant="success" />
          </View>
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <ThemedText variant="headline" style={styles.sectionTitle}>
            Today's Consultations & Visits ({sessions.length} Patient{sessions.length !== 1 ? "s" : ""})
          </ThemedText>

          {isLoading ? (
            <Card elevation="flat" style={styles.loadingCard}>
              <ActivityIndicator color={colors.ink} size="small" />
              <ThemedText variant="body" style={styles.loadingText}>
                Loading daily schedule…
              </ThemedText>
            </Card>
          ) : error ? (
            <Card elevation="flat" style={styles.errorCard}>
              <ThemedText variant="headline" style={styles.errorTitle}>
                Could not load consultations
              </ThemedText>
              <ThemedText variant="caption" style={styles.errorBody}>
                An error occurred while fetching your rota for today.
              </ThemedText>
              <Button title="Try Again" size="sm" variant="secondary" onPress={() => refetch()} />
            </Card>
          ) : sessions.length === 0 ? (
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
                        label={isVideo ? "VIDEO CONSULT" : s.type === "van" ? "VAN VISIT" : "IN-CLINIC"}
                        variant={isVideo ? "info" : s.type === "van" ? "success" : "default"}
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

                    {/* MB-4: Channel-aware action */}
                    {isReady ? (
                      <View style={styles.actionRow}>
                        {isVideo ? (
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
                        ) : (
                          <Button
                            title="Open Patient Record & Notes ›"
                            size="md"
                            variant="primary"
                            onPress={() =>
                              router.push({
                                pathname: "/(clinician)/patient-record" as any,
                                params: {
                                  appointmentId: s.id,
                                  patientId: s.patientId,
                                  patientName: s.patientName,
                                  chiefComplaint: s.chiefComplaint,
                                  channel: s.type,
                                },
                              })
                            }
                          />
                        )}
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
                    email: "patient@example.test",
                    firstName: "Test",
                    lastName: "Patient",
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
                    email: "operator@example.test",
                    firstName: "Test",
                    lastName: "Operator",
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
  badgeWrapper: {
    alignSelf: "flex-start",
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
    flex: 1,
    gap: 2,
  },
  docName: {
    color: colors.label,
  },
  docRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 180,
  },
  errorBody: {
    color: colors.secondaryLabel,
  },
  errorCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  errorTitle: {
    color: colors.danger,
  },
  gdcSubtext: {
    color: colors.secondaryLabel,
    fontSize: 12,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.secondaryLabel,
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

