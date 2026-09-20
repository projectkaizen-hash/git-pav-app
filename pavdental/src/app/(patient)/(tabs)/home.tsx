import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { useCurrentUser } from "@/features/auth/auth-store";

export default function PatientHomeScreen() {
  const router = useRouter();
  const user = useCurrentUser();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Banner */}
      <View style={styles.header}>
        <ThemedText variant="largeTitle" style={styles.greeting}>
          Hello, {user?.firstName || "Patient"} 👋
        </ThemedText>
        <ThemedText variant="subhead" style={styles.subtitle}>
          How would you like to receive care today?
        </ThemedText>
      </View>

      {/* 3 Channels Quick-Book */}
      <View style={styles.section}>
        <ThemedText variant="headline" style={styles.sectionTitle}>
          Choose Care Channel
        </ThemedText>

        <View style={styles.channelGrid}>
          {/* Mobile Van */}
          <Pressable
            onPress={() => router.push("/(patient)/van/service-area" as any)}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <Card elevation="raised" style={styles.channelCard}>
              <View style={styles.channelIconBox}>
                <ThemedText variant="title">🚐</ThemedText>
              </View>
              <View style={styles.channelInfo}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="headline">Mobile Van</ThemedText>
                  <Badge label="Popular" variant="success" />
                </View>
                <ThemedText variant="caption" style={styles.channelDesc}>
                  Fully equipped clinical van visits your driveway or office.
                </ThemedText>
              </View>
            </Card>
          </Pressable>

          {/* Video Consultation */}
          <Pressable
            onPress={() => router.push("/(patient)/video/intake" as any)}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <Card elevation="raised" style={styles.channelCard}>
              <View style={styles.channelIconBox}>
                <ThemedText variant="title">🎥</ThemedText>
              </View>
              <View style={styles.channelInfo}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="headline">Video Consult</ThemedText>
                  <Badge label="Fast Triage" variant="info" />
                </View>
                <ThemedText variant="caption" style={styles.channelDesc}>
                  Speak to a dentist in 15 mins for pain, prescriptions & advice.
                </ThemedText>
              </View>
            </Card>
          </Pressable>

          {/* Clinic Visit */}
          <Pressable
            onPress={() => router.push("/(patient)/clinic/clinic-picker" as any)}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <Card elevation="raised" style={styles.channelCard}>
              <View style={styles.channelIconBox}>
                <ThemedText variant="title">🏥</ThemedText>
              </View>
              <View style={styles.channelInfo}>
                <View style={styles.rowBetween}>
                  <ThemedText variant="headline">In-Clinic Practice</ThemedText>
                </View>
                <ThemedText variant="caption" style={styles.channelDesc}>
                  Traditional modern practice for surgery, hygiene & implants.
                </ThemedText>
              </View>
            </Card>
          </Pressable>
        </View>
      </View>

      {/* Emergency Triage Notice */}
      <Card style={styles.emergencyCard}>
        <View style={styles.emergencyIcon}>
          <ThemedText variant="title">🚨</ThemedText>
        </View>
        <View style={styles.emergencyContent}>
          <ThemedText variant="headline" style={styles.emergencyTitle}>
            Severe Pain or Swelling?
          </ThemedText>
          <ThemedText variant="caption" style={styles.emergencySub}>
            If you have difficulty breathing, swallowing, or severe bleeding, please call 999 immediately.
          </ThemedText>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  channelCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  channelDesc: {
    color: colors.secondaryLabel,
  },
  channelGrid: {
    gap: spacing.sm,
  },
  channelIconBox: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  channelInfo: {
    flex: 1,
    gap: spacing.xxs,
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
  emergencyCard: {
    alignItems: "center",
    backgroundColor: colors.dangerSubtle,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  emergencyContent: {
    flex: 1,
    gap: 2,
  },
  emergencyIcon: {
    padding: spacing.xs,
  },
  emergencySub: {
    color: colors.danger,
    opacity: 0.9,
  },
  emergencyTitle: {
    color: colors.danger,
  },
  greeting: {
    color: colors.label,
  },
  header: {
    gap: spacing.xxs,
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.label,
  },
  subtitle: {
    color: colors.secondaryLabel,
  },
});

