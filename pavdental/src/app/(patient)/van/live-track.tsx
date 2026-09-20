import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ThemedText, Card, Button, Badge } from "@/components";
import { colors, spacing } from "@/theme";

export default function VanLiveTrackScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Top Floating Status Banner */}
        <View style={styles.topFloat}>
          <View style={styles.backRow}>
            <Pressable
              onPress={() => router.replace("/(patient)/(tabs)/home")}
              style={styles.backBtn}
            >
              <ThemedText variant="headline">✕ Close Map</ThemedText>
            </Pressable>
            <Badge label="Live GPS" variant="success" />
          </View>
        </View>

        {/* Map View Placeholder with Route Simulation */}
        <View style={styles.mapArea}>
          {/* Simulated Map Visual */}
          <View style={styles.mapBackground}>
            <View style={styles.routeLine} />

            {/* Van Pin */}
            <View style={styles.vanMarker}>
              <ThemedText variant="title">🚐</ThemedText>
              <View style={styles.pulseRing} />
            </View>

            {/* Patient Home Pin */}
            <View style={styles.homeMarker}>
              <ThemedText variant="title">📍</ThemedText>
              <ThemedText variant="caption" style={styles.homeLabel}>
                Your Home
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom Van Status Card */}
        <Card elevation="raised" style={styles.bottomCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusDotRow}>
              <View style={styles.greenPulse} />
              <ThemedText variant="headline" style={styles.statusTitle}>
                Van is En Route
              </ThemedText>
            </View>
            <ThemedText variant="headline" style={styles.etaText}>
              ETA: ~12 mins
            </ThemedText>
          </View>

          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <ThemedText variant="title">👨‍⚕️</ThemedText>
            </View>
            <View style={styles.driverInfo}>
              <ThemedText variant="headline" style={styles.driverName}>
                Dr. Tariq Pav & Nurse Chloe
              </ThemedText>
              <ThemedText variant="caption" style={styles.driverSub}>
                Vehicle: Mercedes Sprinter (Reg: PV24 DEN)
              </ThemedText>
            </View>
          </View>

          <View style={styles.reminderBox}>
            <ThemedText variant="caption" style={styles.reminderText}>
              🔔 <ThemedText variant="caption" style={styles.reminderBold}>Next up:</ThemedText> You'll receive a push notification when the van is 10 minutes away. Please ensure driveway access is clear.
            </ThemedText>
          </View>

          <Button
            title="Simulate Van Arrived & Complete Visit"
            size="md"
            onPress={() => router.replace("/(patient)/van/complete" as any)}
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    backgroundColor: colors.systemBackground,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  backRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottomCard: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
    margin: spacing.md,
    padding: spacing.md,
  },
  container: {
    flex: 1,
    position: "relative",
  },
  driverAvatar: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  driverInfo: {
    gap: 2,
  },
  driverName: {
    color: colors.label,
  },
  driverRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  driverSub: {
    color: colors.secondaryLabel,
  },
  etaText: {
    color: colors.brand,
    fontWeight: "700",
  },
  greenPulse: {
    backgroundColor: colors.success,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  homeLabel: {
    backgroundColor: colors.systemBackground,
    borderRadius: 6,
    color: colors.label,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  homeMarker: {
    alignItems: "center",
    bottom: "35%",
    position: "absolute",
    right: "25%",
  },
  mapArea: {
    backgroundColor: "#E2E8F0",
    flex: 1,
  },
  mapBackground: {
    alignItems: "center",
    backgroundColor: "#E2E8F0",
    flex: 1,
    justifyContent: "center",
    position: "relative",
  },
  pulseRing: {
    borderColor: colors.brand,
    borderRadius: 22,
    borderWidth: 2,
    height: 44,
    opacity: 0.6,
    position: "absolute",
    width: 44,
  },
  reminderBold: {
    color: colors.label,
    fontWeight: "700",
  },
  reminderBox: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 8,
    padding: spacing.sm,
  },
  reminderText: {
    color: colors.secondaryLabel,
    lineHeight: 16,
  },
  routeLine: {
    backgroundColor: colors.brand,
    borderRadius: 2,
    height: 4,
    position: "absolute",
    transform: [{ rotate: "-25deg" }],
    width: 240,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  statusDotRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  statusHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusTitle: {
    color: colors.label,
  },
  topFloat: {
    left: spacing.md,
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    zIndex: 10,
  },
  vanMarker: {
    alignItems: "center",
    justifyContent: "center",
    left: "25%",
    position: "absolute",
    top: "35%",
  },
});

