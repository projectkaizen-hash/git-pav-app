import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedText, Card, Badge, Button, AppIcon } from "@/components";
import { colors, spacing } from "@/theme";
import { useCurrentUser } from "@/features/auth/auth-store";
import { authFetch } from "@/features/auth/auth-api";

export default function ClinicianConsultRoomScreen() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const params = useLocalSearchParams<{
    patientName?: string;
    appointmentId?: string;
    chiefComplaint?: string;
  }>();

  const patientName = params.patientName || "Alexander Wright";
  const appointmentId = params.appointmentId || "appt_video_active";
  const chiefComplaint = params.chiefComplaint || "Severe LR7 throbbing pain upon cold liquids";

  const clinicianName = currentUser?.firstName
    ? `Dr. ${currentUser.firstName} ${currentUser.lastName}`
    : "Dr. Tariq Pav";

  const [activeTab, setActiveTab] = useState<"video" | "triage" | "chart">("video");
  const [selectedTooth, setSelectedTooth] = useState<number>(31);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Initialize WebRTC room from backend
  useEffect(() => {
    async function initRoom() {
      try {
        const res = await authFetch("/api/video/rooms", {
          method: "POST",
          body: JSON.stringify({ appointmentId }),
        });
        if (res.ok) {
          const data = await res.json();
          setRoomUrl(data.url);
          setRoomName(data.roomName);
        }
      } catch (err) {
        console.warn("[WebRTC init fallback]", err);
      }
    }
    initRoom();
  }, [appointmentId]);

  // Live Call Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleEndAndPrescribe = () => {
    router.push({
      pathname: "/(clinician)/rx-dispense" as any,
      params: {
        patientName,
        appointmentId,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View style={styles.patientBadge}>
            <ThemedText variant="headline" style={styles.patientName}>
              {patientName}
            </ThemedText>
            <Badge label={`${formatTime(seconds)}`} variant="success" />
          </View>
          <Pressable
            onPress={() => router.replace("/(clinician)/schedule")}
            style={styles.exitBtn}
          >
            <ThemedText variant="caption" style={styles.exitText}>
              ✕ Exit Room
            </ThemedText>
          </Pressable>
        </View>

        {/* Tab Switcher for Clinician Multi-Tasking */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setActiveTab("video")}
            style={[styles.tabItem, activeTab === "video" && styles.tabItemActive]}
          >
            <ThemedText
              variant="caption"
              style={[styles.tabText, activeTab === "video" && styles.tabTextActive]}
            >
              📹 Video Call
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("triage")}
            style={[styles.tabItem, activeTab === "triage" && styles.tabItemActive]}
          >
            <ThemedText
              variant="caption"
              style={[styles.tabText, activeTab === "triage" && styles.tabTextActive]}
            >
              📋 Triage & Photos
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("chart")}
            style={[styles.tabItem, activeTab === "chart" && styles.tabItemActive]}
          >
            <ThemedText
              variant="caption"
              style={[styles.tabText, activeTab === "chart" && styles.tabTextActive]}
            >
              🦷 Tooth Chart
            </ThemedText>
          </Pressable>
        </View>

        {/* Dynamic Center Area */}
        {activeTab === "video" ? (
          <View style={styles.videoArea}>
            <View style={styles.streamBox}>
              <AppIcon
                name={isCameraOff ? "micOff" : "video"}
                size={44}
                color={colors.tertiaryLabel}
              />
              <ThemedText variant="headline" style={styles.streamText}>
                {patientName}
              </ThemedText>
              <ThemedText variant="caption" style={styles.hdTag}>
                HD 1080p · Daily.co WebRTC Encrypted
              </ThemedText>
              {roomName && (
                <ThemedText variant="caption" style={styles.roomTag}>
                  Room: {roomName}
                </ThemedText>
              )}

              {roomUrl && (
                <Pressable
                  onPress={() => Linking.openURL(roomUrl)}
                  style={styles.openWebRtcBtn}
                >
                  <ThemedText variant="caption" style={styles.openWebRtcText}>
                    🌐 Launch Fullscreen Daily.co WebRTC Room
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {/* Self Picture-in-Picture */}
            <View style={styles.smallSelfPip}>
              <ThemedText variant="caption" style={styles.pipLabel}>
                {clinicianName}
              </ThemedText>
            </View>

            {/* In-Call Controls Bar */}
            <View style={styles.callControlsRow}>
              <Pressable
                onPress={() => setIsMuted(!isMuted)}
                style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              >
                <AppIcon name={isMuted ? "micOff" : "mic"} size={18} color={colors.label} />
                <ThemedText variant="caption" style={styles.controlText}>
                  {isMuted ? "Unmute" : "Mute"}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setIsCameraOff(!isCameraOff)}
                style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
              >
                <AppIcon name="video" size={18} color={colors.label} />
                <ThemedText variant="caption" style={styles.controlText}>
                  {isCameraOff ? "Start Video" : "Stop Video"}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("chart")}
                style={styles.controlBtn}
              >
                <ThemedText variant="headline">🦷</ThemedText>
                <ThemedText variant="caption" style={styles.controlText}>
                  Chart
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : activeTab === "triage" ? (
          <ScrollView contentContainerStyle={styles.triageScroll}>
            <Card elevation="raised" style={styles.triageCard}>
              <ThemedText variant="headline">Patient Reported Symptoms</ThemedText>
              <ThemedText variant="body" style={styles.triageText}>
                "{chiefComplaint}"
              </ThemedText>
              <View style={styles.metricRow}>
                <ThemedText variant="caption">Pain Severity: 7 / 10</ThemedText>
                <ThemedText variant="caption">Swelling: None visible</ThemedText>
              </View>
            </Card>

            <Card elevation="raised" style={styles.triageCard}>
              <ThemedText variant="headline">Submitted Intraoral Photos (4)</ThemedText>
              <View style={styles.photoGrid}>
                <View style={styles.photoThumb}>
                  <ThemedText variant="caption">Front Bite</ThemedText>
                </View>
                <View style={[styles.photoThumb, styles.photoThumbFocus]}>
                  <ThemedText variant="caption">LR7 Cavity</ThemedText>
                </View>
                <View style={styles.photoThumb}>
                  <ThemedText variant="caption">Upper Arch</ThemedText>
                </View>
                <View style={styles.photoThumb}>
                  <ThemedText variant="caption">Lower Arch</ThemedText>
                </View>
              </View>
            </Card>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.triageScroll}>
            <Card elevation="raised" style={styles.triageCard}>
              <View style={styles.odontogramHeader}>
                <ThemedText variant="headline">Interactive Odontogram (32 Teeth)</ThemedText>
                <Badge label="Active Charting" variant="info" />
              </View>
              <ThemedText variant="caption" style={styles.chartSub}>
                Tap any tooth to review condition or record clinical findings during consult.
              </ThemedText>

              {/* Upper Arch */}
              <ThemedText variant="caption" style={styles.archLabel}>
                Upper Arch (Maxillary #1–#16)
              </ThemedText>
              <View style={styles.archRow}>
                {Array.from({ length: 16 }, (_, i) => i + 1).map((num) => {
                  const isSelected = selectedTooth === num;
                  return (
                    <Pressable
                      key={num}
                      onPress={() => setSelectedTooth(num)}
                      style={[
                        styles.toothCapsule,
                        isSelected && styles.toothCapsuleSelected,
                      ]}
                    >
                      <ThemedText
                        variant="caption"
                        style={[
                          styles.toothNumText,
                          isSelected && styles.toothNumTextSelected,
                        ]}
                      >
                        {num}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Lower Arch */}
              <ThemedText variant="caption" style={styles.archLabel}>
                Lower Arch (Mandibular #17–#32)
              </ThemedText>
              <View style={styles.archRow}>
                {Array.from({ length: 16 }, (_, i) => i + 17).map((num) => {
                  const isSelected = selectedTooth === num;
                  const isDecay = num === 31;
                  return (
                    <Pressable
                      key={num}
                      onPress={() => setSelectedTooth(num)}
                      style={[
                        styles.toothCapsule,
                        isDecay && styles.toothCapsuleDecay,
                        isSelected && styles.toothCapsuleSelected,
                      ]}
                    >
                      <ThemedText
                        variant="caption"
                        style={[
                          styles.toothNumText,
                          isDecay && styles.toothNumTextDecay,
                          isSelected && styles.toothNumTextSelected,
                        ]}
                      >
                        {num}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </Card>

            {/* Selected Tooth Detail */}
            <Card elevation="raised" style={styles.triageCard}>
              <View style={styles.odontogramHeader}>
                <ThemedText variant="headline">
                  Tooth #{selectedTooth} {selectedTooth === 31 ? "(LR7 / 47) · Decay" : "· Sound"}
                </ThemedText>
                {selectedTooth === 31 ? (
                  <Badge label="Early Risk (15-25%)" variant="warning" />
                ) : (
                  <Badge label="Healthy" variant="success" />
                )}
              </View>
              <ThemedText variant="body" style={styles.triageText}>
                {selectedTooth === 31
                  ? "Distal-occlusal demineralisation with active dentinal sensitivity. Requires composite restoration and fluoride varnish application."
                  : "No abnormal mobility, gingival pocketing < 3mm, sound margins."}
              </ThemedText>
              <View style={styles.actionPillRow}>
                <Button
                  title="Prescribe Antibiotic (EPS)"
                  size="sm"
                  variant="secondary"
                  onPress={handleEndAndPrescribe}
                />
              </View>
            </Card>
          </ScrollView>
        )}

        {/* Clinician Action Control Bar */}
        <View style={styles.controls}>
          <Button
            title="Conclude Call & Write Prescription (EPS) ›"
            size="lg"
            onPress={handleEndAndPrescribe}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  callControlsRow: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
    marginTop: spacing.md,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  controlBtn: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 16,
    gap: 2,
    height: 64,
    justifyContent: "center",
    width: 72,
  },
  controlBtnActive: {
    backgroundColor: colors.dangerSubtle,
  },
  controlText: {
    color: colors.label,
  },
  controls: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  exitBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  exitText: {
    color: colors.danger,
    fontWeight: "600",
  },
  hdTag: {
    color: colors.success,
    fontWeight: "600",
  },
  metricRow: {
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  openWebRtcBtn: {
    backgroundColor: colors.inkSubtle,
    borderRadius: 8,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  openWebRtcText: {
    color: colors.ink,
    fontWeight: "700",
  },
  patientBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  patientName: {
    color: colors.label,
  },
  photoGrid: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  photoThumb: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    height: 72,
    justifyContent: "center",
  },
  photoThumbFocus: {
    backgroundColor: colors.inkSubtle,
    borderColor: colors.ink,
  },
  pipLabel: {
    color: colors.label,
    fontWeight: "600",
  },
  roomTag: {
    color: colors.secondaryLabel,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  smallSelfPip: {
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    position: "absolute",
    right: spacing.xl,
    top: spacing.xl,
  },
  streamBox: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 24,
    gap: spacing.xs,
    height: 320,
    justifyContent: "center",
    width: "100%",
  },
  streamText: {
    color: colors.label,
  },
  tabItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: spacing.sm,
  },
  tabItemActive: {
    backgroundColor: colors.systemBackground,
    borderBottomColor: colors.ink,
    borderBottomWidth: 2,
  },
  tabRow: {
    backgroundColor: colors.secondaryBackground,
    borderBottomColor: colors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  tabText: {
    color: colors.secondaryLabel,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.ink,
  },
  topBar: {
    alignItems: "center",
    borderBottomColor: colors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  triageCard: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
    padding: spacing.md,
  },
  triageScroll: {
    gap: spacing.md,
    padding: spacing.md,
  },
  triageText: {
    color: colors.secondaryLabel,
    fontStyle: "italic",
    lineHeight: 20,
  },
  videoArea: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  actionPillRow: {
    flexDirection: "row",
    marginTop: spacing.xs,
  },
  archLabel: {
    color: colors.secondaryLabel,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  archRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "space-between",
    marginTop: 4,
  },
  chartSub: {
    color: colors.secondaryLabel,
  },
  odontogramHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  toothCapsule: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 6,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 2,
  },
  toothCapsuleDecay: {
    backgroundColor: colors.warningSubtle,
    borderColor: colors.warning,
  },
  toothCapsuleSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  toothNumText: {
    color: colors.label,
    fontSize: 10,
    fontWeight: "700",
  },
  toothNumTextDecay: {
    color: colors.warning,
  },
  toothNumTextSelected: {
    color: colors.alwaysWhite,
  },
});
