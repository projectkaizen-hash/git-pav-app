import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
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

interface ChatMessage {
  id: string;
  sender: "doctor" | "patient";
  text?: string;
  time: string;
  isRx?: boolean;
}

export default function VideoCallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { appointmentId, roomUrl } = useLocalSearchParams<{ appointmentId?: string; roomUrl?: string }>();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_1",
      sender: "patient",
      text: "Yes, my gum feels a bit swollen near the back tooth.",
      time: "8:20 AM",
    },
    {
      id: "msg_2",
      sender: "doctor",
      text: "I can see the mild inflammation on your photos. I'll prescribe antibiotics and painkillers right now.",
      time: "8:21 AM",
    },
    {
      id: "msg_3",
      sender: "doctor",
      isRx: true,
      time: "8:21 AM",
    },
  ]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: "patient",
      text: inputText.trim(),
      time: "Just now",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  };

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
              11:24
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
            accessibilityLabel="Snap Intraoral Close-up Photo"
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              const photoMsg: ChatMessage = {
                id: `msg_photo_${Date.now()}`,
                sender: "patient",
                text: "📷 High-res Intraoral Close-up (LR7 Molar attached)",
                time: "Just now",
              };
              setMessages((prev) => [...prev, photoMsg]);
            }}
            style={styles.glassBtn}
          >
            <AppIcon name="camera" size={18} color={colors.alwaysWhite} />
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
              Dr. Emily Carter
            </ThemedText>
          </View>
        </View>

        <ScrollView
          style={styles.messageScroll}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => {
            if (m.isRx) {
              return (
                <View key={m.id} style={styles.rxCard}>
                  <ThemedText variant="subhead" style={styles.rxTitle}>
                    Prescription & Care Plan
                  </ThemedText>
                  <View style={styles.rxList}>
                    <View style={styles.rxRow}>
                      <View style={styles.bullet} />
                      <ThemedText variant="caption" style={styles.rxItem}>
                        <ThemedText variant="caption" style={styles.bold}>
                          Antibiotic:{" "}
                        </ThemedText>
                        Amoxicillin 500 mg, 3 times a day for 5 days
                      </ThemedText>
                    </View>
                    <View style={styles.rxRow}>
                      <View style={styles.bullet} />
                      <ThemedText variant="caption" style={styles.rxItem}>
                        <ThemedText variant="caption" style={styles.bold}>
                          Pain reliever:{" "}
                        </ThemedText>
                        Ibuprofen 400 mg, every 6–8 hours if needed
                      </ThemedText>
                    </View>
                    <View style={styles.rxRow}>
                      <View style={styles.bullet} />
                      <ThemedText variant="caption" style={styles.rxItem}>
                        <ThemedText variant="caption" style={styles.bold}>
                          Clinical Action:{" "}
                        </ThemedText>
                        Schedule an X-ray / clinic review this week
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText variant="caption" style={styles.rxFooter}>
                    {m.time} · Sent to registered pharmacy
                  </ThemedText>
                </View>
              );
            }

            const isPatient = m.sender === "patient";
            return (
              <View
                key={m.id}
                style={[
                  styles.bubbleRow,
                  isPatient ? styles.bubbleRowPatient : styles.bubbleRowDoctor,
                ]}
              >
                {!isPatient ? (
                  <Image
                    source={require("../../../../assets/images/doctor.jpg")}
                    style={styles.inlineAvatar}
                  />
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    isPatient ? styles.bubblePatient : styles.bubbleDoctor,
                  ]}
                >
                  <ThemedText
                    variant="body"
                    style={isPatient ? styles.bubbleTextPatient : styles.bubbleTextDoctor}
                  >
                    {m.text}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Message Input Bar (Reference 1) */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(spacing.xs, insets.bottom) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Attach photo or file"
            style={styles.attachBtn}
          >
            <AppIcon name="plus" size={18} color={colors.secondaryLabel} />
          </Pressable>

          <TextInput
            placeholder="Type Your Message..."
            placeholderTextColor={colors.tertiaryLabel}
            value={inputText}
            onChangeText={setInputText}
            style={styles.chatInput}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={handleSendMessage}
            style={styles.sendBtn}
          >
            <AppIcon name="chevronRight" size={16} color={colors.alwaysWhite} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  attachBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
  },
  backCircle: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  bold: {
    fontWeight: "700",
  },
  bubble: {
    borderRadius: 18,
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleDoctor: {
    backgroundColor: colors.secondaryBackground,
    borderTopLeftRadius: 4,
  },
  bubblePatient: {
    backgroundColor: colors.ink,
    borderTopRightRadius: 4,
  },
  bubbleRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  bubbleRowDoctor: {
    justifyContent: "flex-start",
  },
  bubbleRowPatient: {
    justifyContent: "flex-end",
  },
  bubbleTextDoctor: {
    color: colors.label,
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextPatient: {
    color: colors.alwaysWhite,
    fontSize: 14,
    lineHeight: 20,
  },
  bullet: {
    backgroundColor: colors.ink,
    borderRadius: 2,
    height: 4,
    marginTop: 6,
    width: 4,
  },
  chatInput: {
    color: colors.label,
    flex: 1,
    fontSize: 14,
    minHeight: 40,
    paddingHorizontal: spacing.xs,
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
  inlineAvatar: {
    borderRadius: radius.full,
    height: 24,
    width: 24,
  },
  inputBar: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  messageContent: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  messageScroll: {
    flex: 1,
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
  rxCard: {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  rxFooter: {
    color: colors.secondaryLabel,
    fontSize: 11,
    marginTop: 2,
  },
  rxItem: {
    color: colors.label,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  rxList: {
    gap: 6,
  },
  rxRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 6,
  },
  rxTitle: {
    color: colors.label,
    fontSize: 13,
    fontWeight: "700",
  },
  safe: {
    backgroundColor: colors.alwaysBlack,
    flex: 1,
  },
  sendBtn: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
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
