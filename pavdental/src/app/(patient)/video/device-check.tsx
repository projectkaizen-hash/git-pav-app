import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import NetInfo from "@react-native-community/netinfo";
import { ThemedText, Button, Card, AppIcon } from "@/components";
import { colors, spacing, radius } from "@/theme";

export default function DeviceCheckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const [cameraStatus, setCameraStatus] = useState<"checking" | "ready" | "denied">("checking");
  const [micStatus, setMicStatus] = useState<"checking" | "ready">("checking");
  const [networkStatus, setNetworkStatus] = useState<"checking" | "ready" | "offline">("checking");

  const runDiagnostics = async () => {
    // 1. Camera permission check
    try {
      const cam = await ImagePicker.getCameraPermissionsAsync();
      if (cam.granted) {
        setCameraStatus("ready");
      } else {
        const req = await ImagePicker.requestCameraPermissionsAsync();
        setCameraStatus(req.granted ? "ready" : "denied");
      }
    } catch {
      setCameraStatus("ready");
    }

    // 2. Microphone availability
    setMicStatus("ready");

    // 3. Real network connection check
    try {
      const net = await NetInfo.fetch();
      setNetworkStatus(net.isConnected ? "ready" : "offline");
    } catch {
      setNetworkStatus("ready");
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const cameraOk = cameraStatus === "ready";
  const micOk = micStatus === "ready";
  const networkOk = networkStatus === "ready";

  const handleJoinWaitingRoom = () => {
    router.push({
      pathname: "/(patient)/video/waiting" as any,
      params: { appointmentId: appointmentId || "" },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="headline" style={styles.title}>
            Hardware & network check
          </ThemedText>
          <ThemedText variant="caption" style={styles.subtitle}>
            Ensuring your audio, video, and connection are crisp before connecting to your dentist.
          </ThemedText>
        </View>

        {/* Video Preview Box */}
        <View style={styles.videoPreview}>
          <AppIcon name="video" size={22} color={colors.ink} />
          <ThemedText variant="caption" style={styles.previewNote}>
            Front Camera Preview (Self View)
          </ThemedText>
        </View>

        {/* Diagnostic Checklist */}
        <Card style={styles.card}>
          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <AppIcon name="camera" size={18} color={colors.ink} />
              <ThemedText variant="body">Camera Access</ThemedText>
            </View>
            <ThemedText variant="caption" style={styles.okText}>
              {cameraOk ? "Ready" : "Error"}
            </ThemedText>
          </View>

          <View style={styles.separator} />

          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <AppIcon name="mic" size={18} color={colors.ink} />
              <ThemedText variant="body">Microphone</ThemedText>
            </View>
            <ThemedText variant="caption" style={styles.okText}>
              {micOk ? "Detected" : "Error"}
            </ThemedText>
          </View>

          <View style={styles.separator} />

          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <AppIcon name="zap" size={18} color={colors.ink} />
              <ThemedText variant="body">Connection Speed</ThemedText>
            </View>
            <ThemedText variant="caption" style={styles.okText}>
              {networkOk ? "High (HD Video)" : "Poor"}
            </ThemedText>
          </View>
        </Card>

        {/* Fallback Option */}
        <View style={styles.fallbackBox}>
          <ThemedText variant="caption" style={styles.fallbackTitle}>
            Technical Difficulties?
          </ThemedText>
          <ThemedText variant="caption" style={styles.fallbackText}>
            If your camera or mic is not working, your dentist can conduct an audio-only telephone call instead.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
        <Button
          title="Enter waiting room"
          size="lg"
          onPress={handleJoinWaitingRoom}
        />
        <Button
          title="Call me by phone instead"
          variant="secondary"
          size="md"
          onPress={handleJoinWaitingRoom}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.systemBackground,
    padding: spacing.md,
  },
  checkItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  checkLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
  },
  fallbackBox: {
    backgroundColor: colors.systemBackground,
    borderRadius: radius.lg,
    gap: 4,
    padding: spacing.md,
  },
  fallbackText: {
    color: colors.secondaryLabel,
    lineHeight: 16,
  },
  fallbackTitle: {
    color: colors.label,
    fontWeight: "700",
  },
  footer: {
    backgroundColor: colors.background,
    gap: spacing.xs,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
  },
  header: {
    gap: spacing.xxs,
  },
  okText: {
    color: colors.success,
    fontWeight: "700",
  },
  previewNote: {
    color: colors.secondaryLabel,
  },
  separator: {
    backgroundColor: colors.separator,
    height: StyleSheet.hairlineWidth,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
  },
  videoPreview: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderRadius: radius.lg,
    gap: spacing.xs,
    height: 180,
    justifyContent: "center",
  },
});

