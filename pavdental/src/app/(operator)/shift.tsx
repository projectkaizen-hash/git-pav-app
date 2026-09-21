import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, ScrollView, Switch, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemedText, Card, Badge, Button } from "@/components";
import { colors, spacing } from "@/theme";
import {
  fetchCurrentShift,
  startShift,
  endShift,
  pauseShift,
  resumeShift,
  sendLocationPing,
} from "@/features/van/van-api";

export default function OperatorShiftScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [gpsActive, setGpsActive] = useState(false);
  const locationIntervalRef = useRef<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["operator-shift"],
    queryFn: fetchCurrentShift,
    refetchInterval: 10000,
  });

  const shift = data?.shift;
  const van = data?.van;
  const queue = data?.queue ?? [];
  const incoming = data?.incoming ?? [];
  const isOnline = shift?.status === "online";
  const isPaused = shift?.status === "paused";
  const isOnShift = isOnline || isPaused;

  // GPS ping simulation / real loop
  useEffect(() => {
    if (isOnShift && !locationIntervalRef.current) {
      setGpsActive(true);
      // Mock London coordinates for dev; replace with Location.watchPositionAsync in production
      let mockLat = 51.5074;
      let mockLng = -0.1278;
      locationIntervalRef.current = setInterval(async () => {
        try {
          // slight drift simulation
          mockLat += (Math.random() - 0.5) * 0.001;
          mockLng += (Math.random() - 0.5) * 0.001;
          await sendLocationPing({ lat: mockLat, lng: mockLng, accuracyM: 10 });
        } catch {
          // Location ping errors are non-fatal
        }
      }, 20000); // every 20s
    } else if (!isOnShift && locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
      setGpsActive(false);
    }
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, [isOnShift]);

  const startMutation = useMutation({
    mutationFn: () => startShift({ lat: 51.5074, lng: -0.1278 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-shift"] });
      Alert.alert("Shift Started", "Your van is now online and accepting requests.");
    },
    onError: (err: any) => {
      Alert.alert("Could Not Start Shift", err.message || "Failed to start shift");
    },
  });

  const endMutation = useMutation({
    mutationFn: endShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-shift"] });
      Alert.alert("Shift Ended", "Your van is now offline.");
    },
    onError: (err: any) => {
      Alert.alert("Cannot End Shift", err.message || "Failed to end shift");
    },
  });

  const pauseMutation = useMutation({
    mutationFn: pauseShift,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operator-shift"] }),
  });

  const resumeMutation = useMutation({
    mutationFn: resumeShift,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operator-shift"] }),
  });

  const handleToggleShift = (value: boolean) => {
    if (value) {
      startMutation.mutate();
    } else {
      if (queue.length > 0) {
        Alert.alert(
          "Open Stops in Queue",
          `You have ${queue.length} stop(s) in progress. Complete or cancel them before ending your shift.`,
          [{ text: "OK" }]
        );
        return;
      }
      Alert.alert(
        "End Shift",
        "Are you sure you want to end your shift and take the van offline?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "End Shift", style: "destructive", onPress: () => endMutation.mutate() },
        ]
      );
    }
  };

  const getStatusBadge = () => {
    if (isOnline) return <Badge label="● ONLINE · ACCEPTING" variant="success" />;
    if (isPaused) return <Badge label="❚❚ PAUSED · NOT ACCEPTING" variant="warning" />;
    return <Badge label="○ OFFLINE" variant="default" />;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Shift Status Header */}
        <Card elevation="raised" style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusTextCol}>
              <ThemedText variant="largeTitle" style={styles.vanTitle}>
                {van?.name ?? "Van Dispatch"}
              </ThemedText>
              {van?.registrationPlate && (
                <ThemedText variant="caption" style={styles.plate}>
                  {van.registrationPlate}
                </ThemedText>
              )}
            </View>
            <Switch
              value={isOnShift}
              onValueChange={handleToggleShift}
              disabled={startMutation.isPending || endMutation.isPending}
              trackColor={{ false: colors.secondaryBackground, true: colors.brand }}
            />
          </View>
          <View style={styles.badgeRow}>
            {getStatusBadge()}
            {gpsActive && <Badge label="📍 GPS ACTIVE" variant="info" />}
          </View>
        </Card>

        {/* Pause / Resume Controls (only when on shift) */}
        {isOnShift && (
          <View style={styles.controlRow}>
            {isOnline ? (
              <Button
                title="Pause New Requests (Busy)"
                variant="secondary"
                size="sm"
                loading={pauseMutation.isPending}
                onPress={() => pauseMutation.mutate()}
              />
            ) : (
              <Button
                title="Resume Accepting Requests"
                variant="primary"
                size="sm"
                loading={resumeMutation.isPending}
                onPress={() => resumeMutation.mutate()}
              />
            )}
          </View>
        )}

        {/* Incoming Requests Banner */}
        {incoming.length > 0 && (
          <Card elevation="raised" style={styles.incomingBanner}>
            <View style={styles.incomingRow}>
              <ThemedText variant="headline" style={styles.incomingTitle}>
                🔔 {incoming.length} New Request{incoming.length > 1 ? "s" : ""}
              </ThemedText>
              <Button
                title="Review ›"
                size="sm"
                onPress={() => router.push("/(operator)/incoming" as any)}
              />
            </View>
          </Card>
        )}

        {/* Live Queue Summary */}
        <View style={styles.sectionHeader}>
          <ThemedText variant="headline">
            Live Queue ({queue.length} stop{queue.length !== 1 ? "s" : ""})
          </ThemedText>
          {queue.length > 0 && (
            <Button
              title="Full Queue ›"
              variant="ghost"
              size="sm"
              onPress={() => router.push("/(operator)/route" as any)}
            />
          )}
        </View>

        {queue.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="headline" style={styles.emptyTitle}>
              {isOnShift ? "Queue is Empty" : "Shift is Offline"}
            </ThemedText>
            <ThemedText variant="caption" style={styles.emptyBody}>
              {isOnShift
                ? "Waiting for incoming patient requests in your coverage area. Keep the app open."
                : "Toggle the switch above to start your shift and put this van online."}
            </ThemedText>
          </Card>
        ) : (
          queue.slice(0, 3).map((stop, idx) => (
            <Card key={stop.id} style={styles.stopCard}>
              <View style={styles.stopTopRow}>
                <Badge label={`STOP #${idx + 1}`} variant="info" />
                <ThemedText variant="caption" style={styles.phaseLabel}>
                  {stop.phase.replace("_", " ").toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText variant="headline">
                {stop.patient?.firstName} {stop.patient?.lastName}
              </ThemedText>
              <ThemedText variant="caption" style={styles.address}>
                📍 {stop.accessDetails?.addressLine1}, {stop.accessDetails?.postcode}
              </ThemedText>
              <ThemedText variant="caption" style={styles.service}>
                🦷 {stop.service?.name}
              </ThemedText>
            </Card>
          ))
        )}

        {/* Quick Navigation Links */}
        <View style={styles.quickNav}>
          <Button
            title="View Live Queue Route ›"
            variant="secondary"
            onPress={() => router.push("/(operator)/route" as any)}
          />
          {incoming.length > 0 && (
            <Button
              title={`View ${incoming.length} Incoming Request(s) ›`}
              onPress={() => router.push("/(operator)/incoming" as any)}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  address: {
    color: colors.secondaryLabel,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
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
  controlRow: {
    flexDirection: "row",
  },
  emptyBody: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    gap: spacing.xs,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.label,
  },
  incomingBanner: {
    backgroundColor: colors.brandSubtle,
    borderColor: colors.brand,
    borderWidth: 1.5,
    padding: spacing.md,
  },
  incomingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  incomingTitle: {
    color: colors.brand,
  },
  phaseLabel: {
    color: colors.brand,
    fontWeight: "600",
  },
  plate: {
    color: colors.secondaryLabel,
  },
  quickNav: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  service: {
    color: colors.brand,
    fontWeight: "600",
  },
  statusCard: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusTextCol: {
    gap: 2,
  },
  stopCard: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  stopTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  vanTitle: {
    color: colors.label,
  },
});
