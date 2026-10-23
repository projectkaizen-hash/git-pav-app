import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { ThemedText, AppIcon } from "@/components";
import { colors, spacing, radius } from "@/theme";

export default function VideoCallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  // Elapsed time since this screen opened, not a made-up call length.
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const handleEndCall = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    router.replace({
      pathname: "/(patient)/video/summary" as never,
      params: { appointmentId: appointmentId || "" },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Upper Half: Live Video Call Feed with Controls */}
      <View style={styles.videoContainer}>
        <Image
          source={require("../../../../assets/images/doctor.jpg")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />

        {/* Top Video Header: Back + Duration Pill */}
        <View style={styles.videoTopBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minimize call"
            onPress={() => router.back()}
            style={styles.backCircle}
          >
            <AppIcon name="chevronLeft" size={16} color={colors.alwaysWhite} />
          </Pressable>

          <View style={styles.timerBadge}>
            <View style={styles.recordDot} />
            <ThemedText variant="caption" style={styles.timerText}>
              {elapsed}
            </ThemedText>
          </View>
        </View>

        {/* Picture-in-Picture Patient View (Matches Reference 3) */}
        <View style={styles.pipContainer}>
          <Image
            source={require("../../../../assets/images/avatar.jpg")}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </View>

        {/* Floating Translucent Glass Controls Bar (Matches Reference 1 & 3) */}
        <View style={styles.floatingControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isMuted ? "Unmute mic" : "Mute mic"}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setIsMuted((prev) => !prev);
            }}
            style={[styles.glassBtn, isMuted && styles.glassBtnActive]}
          >
            <AppIcon
              name="mic"
              size={18}
              color={isMuted ? colors.danger : colors.alwaysWhite}
            />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSpeakerOn ? "Speaker on" : "Speaker off"}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setIsSpeakerOn((prev) => !prev);
            }}
            style={[styles.glassBtn, !isSpeakerOn && styles.glassBtnActive]}
          >
            <AppIcon name="phone" size={18} color={colors.alwaysWhite} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isVideoOn ? "Camera on" : "Camera off"}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setIsVideoOn((prev) => !prev);
            }}
            style={[styles.glassBtn, !isVideoOn && styles.glassBtnActive]}
          >
            <AppIcon name="video" size={18} color={colors.alwaysWhite} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End consultation"
            onPress={handleEndCall}
            style={styles.endCallBtn}
          >
            <AppIcon name="phone" size={20} color={colors.alwaysWhite} />
          </Pressable>
        </View>
      </View>

      {/* Lower Half: Interactive Chat & Prescription Sheet (Matches Reference 1) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.sheetWrap}
      >
        <View style={styles.sheetHeader}>
          <Image
            source={require("../../../../assets/images/doctor.jpg")}
            style={styles.sheetAvatar}
            contentFit="cover"
          />
          <View>
            <ThemedText variant="caption" style={styles.sheetLabel}>
              Chat Call
            </ThemedText>
            <ThemedText variant="headline" style={styles.sheetDoctor}>
              Your clinician
            </ThemedText>
          </View>
        </View>

        <View style={[styles.messageContent, { paddingBottom: Math.max(spacing.xs, insets.bottom) }]}>
          {/* In-call chat isn't connected to a backend yet, so nothing typed here would reach the clinician. */}
          <ThemedText variant="body" style={styles.bubbleTextDoctor}>
            Talk to your clinician on the call. Any prescription or notes they record will appear in your records afterwards.
          </ThemedText>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backCircle: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  bubbleTextDoctor: {
    color: colors.label,
    fontSize: 14,
    lineHeight: 20,
  },
  endCallBtn: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    height: 44,
    justifyContent: "center",
    transform: [{ rotate: "135deg" }],
    width: 44,
  },
  floatingControls: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: radius.full,
    borderWidth: 1,
    bottom: 16,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    position: "absolute",
  },
  glassBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderRadius: radius.full,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  glassBtnActive: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  messageContent: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  pipContainer: {
    borderColor: colors.alwaysWhite,
    borderRadius: 14,
    borderWidth: 1.5,
    height: 96,
    overflow: "hidden",
    position: "absolute",
    right: 16,
    top: 16,
    width: 72,
  },
  recordDot: {
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    height: 7,
    width: 7,
  },
  safe: {
    backgroundColor: colors.alwaysBlack,
    flex: 1,
  },
  sheetAvatar: {
    borderRadius: radius.full,
    height: 36,
    width: 36,
  },
  sheetDoctor: {
    color: colors.label,
    fontSize: 15,
    fontWeight: "700",
  },
  sheetHeader: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderBottomColor: colors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sheetLabel: {
    color: colors.secondaryLabel,
    fontSize: 11,
  },
  sheetWrap: {
    backgroundColor: colors.systemBackground,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    overflow: "hidden",
  },
  timerBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: radius.full,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timerText: {
    color: colors.alwaysWhite,
    fontSize: 12,
    fontWeight: "600",
  },
  videoContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
    position: "relative",
  },
  videoTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    width: "100%",
  },
});
