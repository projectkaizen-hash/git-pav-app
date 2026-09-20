import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "./themed-text";
import { colors, spacing } from "../theme";

interface DailyVideoViewProps {
  roomUrl: string;
  userName?: string;
  onLeaveCall?: () => void;
}

export function DailyVideoView({ roomUrl: _roomUrl, userName = "Patient", onLeaveCall }: DailyVideoViewProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDurationSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <View style={styles.container}>
      {/* Remote Clinician Stream (Simulated WebRTC Canvas Frame) */}
      <View style={styles.remoteStream}>
        <View style={styles.clinicianAvatar}>
          <ThemedText variant="title" style={styles.avatarSymbol}>
            👨‍⚕️
          </ThemedText>
        </View>
        <ThemedText variant="headline" style={styles.streamLabel}>
          Dr. Tariq Pav (Clinical Consultation)
        </ThemedText>
        <View style={styles.liveBadge}>
          <View style={styles.redDot} />
          <ThemedText variant="caption" style={styles.liveText}>
            LIVE · {formatTimer(durationSeconds)}
          </ThemedText>
        </View>
      </View>

      {/* Local Self-View Preview PIP Window */}
      {!isVideoOff && (
        <View style={styles.localPip}>
          <ThemedText variant="caption" style={styles.pipLabel}>
            {userName} (You)
          </ThemedText>
          {isMuted && (
            <View style={styles.mutedBadge}>
              <ThemedText variant="caption" style={styles.mutedText}>
                🔇 Muted
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Video Call Controls Toolbar */}
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setIsMuted(!isMuted)}
          style={[styles.toolBtn, isMuted && styles.toolBtnActive]}
        >
          <ThemedText variant="headline" style={styles.toolIcon}>
            {isMuted ? "🎙️" : "🎤"}
          </ThemedText>
          <ThemedText variant="caption" style={styles.toolLabel}>
            {isMuted ? "Unmute" : "Mute"}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setIsVideoOff(!isVideoOff)}
          style={[styles.toolBtn, isVideoOff && styles.toolBtnActive]}
        >
          <ThemedText variant="headline" style={styles.toolIcon}>
            {isVideoOff ? "🙈" : "📹"}
          </ThemedText>
          <ThemedText variant="caption" style={styles.toolLabel}>
            {isVideoOff ? "Start Video" : "Stop Video"}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={onLeaveCall}
          style={[styles.toolBtn, styles.endCallBtn]}
        >
          <ThemedText variant="headline" style={styles.endIcon}>
            📞
          </ThemedText>
          <ThemedText variant="caption" style={styles.endLabel}>
            End Call
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarSymbol: {
    fontSize: 40,
  },
  clinicianAvatar: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 44,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  container: {
    backgroundColor: "#0A0E1A",
    borderRadius: 16,
    flex: 1,
    overflow: "hidden",
  },
  endCallBtn: {
    backgroundColor: "#D93838",
  },
  endIcon: {
    fontSize: 22,
    transform: [{ rotate: "135deg" }],
  },
  endLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  liveBadge: {
    alignItems: "center",
    backgroundColor: "rgba(235, 87, 87, 0.2)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveText: {
    color: "#EB5757",
    fontWeight: "700",
  },
  localPip: {
    backgroundColor: "#222B3E",
    borderColor: colors.brand,
    borderRadius: 12,
    borderWidth: 2,
    height: 130,
    justifyContent: "space-between",
    padding: spacing.xs,
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    width: 100,
  },
  mutedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    padding: 2,
  },
  mutedText: {
    color: "#FFD166",
    fontSize: 9,
  },
  pipLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  redDot: {
    backgroundColor: "#EB5757",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  remoteStream: {
    alignItems: "center",
    backgroundColor: "#161D2F",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
  },
  streamLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  toolBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 32,
    gap: 2,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  toolBtnActive: {
    backgroundColor: "#EB5757",
  },
  toolIcon: {
    fontSize: 20,
  },
  toolLabel: {
    color: "#FFFFFF",
    fontSize: 10,
  },
  toolbar: {
    alignItems: "center",
    backgroundColor: "#0F1626",
    borderTopColor: "rgba(255,255,255,0.1)",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});

