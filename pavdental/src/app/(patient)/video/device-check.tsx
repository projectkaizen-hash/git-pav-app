import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Button, Card } from "@/components";
import { colors, spacing } from "@/theme";

export default function DeviceCheckScreen() {
  const router = useRouter();
  const [cameraOk] = useState(true);
  const [micOk] = useState(true);
  const [networkOk] = useState(true);

  const handleJoinWaitingRoom = () => {
    router.push("/(patient)/video/waiting" as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText variant="headline" style={styles.title}>
            Hardware & Network Check
          </ThemedText>
          <ThemedText variant="caption" style={styles.subtitle}>
            Ensuring your audio, video, and connection are crisp before connecting to your dentist.
          </ThemedText>
        </View>

        {/* Video Preview Box */}
        <View style={styles.videoPreview}>
          <ThemedText variant="title">📹</ThemedText>
          <ThemedText variant="caption" style={styles.previewNote}>
            Front Camera Preview (Self View)
          </ThemedText>
        </View>

        {/* Diagnostic Checklist */}
        <Card elevation="raised" style={styles.card}>
          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <ThemedText>📷</ThemedText>
              <ThemedText variant="body">Camera Access</ThemedText>
            </View>
            <ThemedText variant="caption" style={styles.okText}>
              {cameraOk ? "✓ Ready" : "Error"}
            </ThemedText>
          </View>

          <View style={styles.separator} />

          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <ThemedText>🎙</ThemedText>
              <ThemedText variant="body">Microphone</ThemedText>
            </View>
            <ThemedText variant="caption" style={styles.okText}>
              {micOk ? "✓ Detected" : "Error"}
            </ThemedText>
          </View>

          <View style={styles.separator} />

          <View style={styles.checkItem}>
            <View style={styles.checkLeft}>
              <ThemedText>📶</ThemedText>
              <ThemedText variant="body">Connection Speed</ThemedText>
            </View>
            <ThemedText variant="caption" style={styles.okText}>
              {networkOk ? "✓ High (HD Video)" : "Poor"}
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
      <View style={styles.footer}>
        <Button
          title="Enter Waiting Room"
          size="lg"
          onPress={handleJoinWaitingRoom}
        />
        <Button
          title="Call Me by Phone Instead"
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
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  fallbackBox: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
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
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
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
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.xs,
    height: 180,
    justifyContent: "center",
  },
});

