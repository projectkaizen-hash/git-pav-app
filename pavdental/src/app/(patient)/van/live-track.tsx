import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemedText, Card, Button, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { fetchVanRequest, fetchActiveVanRequest, cancelVanRequest } from "@/features/van/van-api";
import { VanServiceRequest, VanStopPhase } from "@/features/van/van-types";

export default function VanLiveTrackScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ requestId?: string }>();

  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Poll request status every 5s
  const { data: request, isLoading } = useQuery<VanServiceRequest | null>({
    queryKey: ["van-request-live", params.requestId],
    queryFn: () =>
      params.requestId
        ? fetchVanRequest(params.requestId)
        : fetchActiveVanRequest(),
    refetchInterval: 5000,
  });

  // Calculate remaining seconds for pending requests
  useEffect(() => {
    if (request?.status === "pending" && request.expiresAt) {
      const updateTimer = () => {
        const remaining = Math.max(
          0,
          Math.floor((new Date(request.expiresAt).getTime() - Date.now()) / 1000)
        );
        setSecondsRemaining(remaining);
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
    setSecondsRemaining(null);
    return undefined;
  }, [request?.status, request?.expiresAt]);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelVanRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["van-request-live"] });
      Alert.alert("Request Cancelled", "Your van visit request has been cancelled.", [
        { text: "OK", onPress: () => router.replace("/(patient)/(tabs)/home") },
      ]);
    },
    onError: (err: any) => {
      Alert.alert("Cannot Cancel", err.message || "Could not cancel request.");
    },
  });

  const handleCancel = () => {
    if (!request) return;
    Alert.alert(
      "Cancel Van Request",
      "Are you sure you want to cancel your mobile surgery request?",
      [
        { text: "Keep Visit", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: () => cancelMutation.mutate(request.id),
        },
      ]
    );
  };

  if (isLoading && !request) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.brand} />
        <ThemedText variant="caption" style={styles.loadingText}>
          Connecting to live van dispatch system...
        </ThemedText>
      </SafeAreaView>
    );
  }

  const phase: VanStopPhase = request?.phase ?? "queued";
  const status = request?.status ?? "pending";
  const etaLabel =
    request?.etaLabel ||
    (request?.etaSecondsSnapshot
      ? `~${Math.round(request.etaSecondsSnapshot / 60)} min`
      : "Calculating...");

  const isTerminal = ["declined", "expired", "completed", "cancelled"].includes(status);
  const canCancel = !isTerminal && phase !== "in_treatment";

  // Step indices for progress bar
  const getStepIndex = () => {
    if (status === "pending") return 0;
    if (status === "accepted" && phase === "queued") return 1;
    if (phase === "en_route") return 2;
    if (phase === "on_site") return 3;
    if (phase === "in_treatment") return 4;
    if (status === "completed") return 5;
    return 0;
  };
  const currentStep = getStepIndex();

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.topFloat}>
          <View style={styles.backRow}>
            <Pressable
              onPress={() => router.replace("/(patient)/(tabs)/home")}
              style={styles.backBtn}
            >
              <ThemedText variant="headline">✕ Close Map</ThemedText>
            </Pressable>
            <Badge
              label={
                status === "pending"
                  ? "⏳ Operator Review"
                  : status === "accepted"
                  ? "✓ In Live Queue"
                  : status.replace("_", " ").toUpperCase()
              }
              variant={
                status === "accepted"
                  ? "success"
                  : status === "pending"
                  ? "warning"
                  : "default"
              }
            />
          </View>
        </View>

        {/* Live Simulation Map Area */}
        <View style={styles.mapArea}>
          <View style={styles.mapBackground}>
            {/* Route track */}
            <View style={styles.routeLine} />

            {/* Van Pin with pulsating wave */}
            <View style={styles.vanMarker}>
              <ThemedText variant="title">🚐</ThemedText>
              <View style={styles.pulseRing} />
            </View>

            {/* Destination Pin */}
            <View style={styles.homeMarker}>
              <ThemedText variant="title">📍</ThemedText>
              <ThemedText variant="caption" style={styles.homeLabel}>
                {request?.accessDetails?.addressLine1 || "Your Address"}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom Dispatch Control Sheet */}
        <Card elevation="raised" style={styles.bottomCard}>
          {/* Status Headline */}
          <View style={styles.statusHeader}>
            <View style={styles.statusDotRow}>
              <View
                style={[
                  styles.statusPulse,
                  {
                    backgroundColor:
                      status === "declined" || status === "expired" || status === "cancelled"
                        ? colors.danger
                        : phase === "in_treatment"
                        ? colors.brand
                        : phase === "on_site"
                        ? colors.warning
                        : colors.success,
                  },
                ]}
              />
              <ThemedText variant="headline" style={styles.statusTitle}>
                {status === "pending"
                  ? "Request Sent · Awaiting Operator"
                  : status === "declined"
                  ? "Request Declined by Operator"
                  : status === "expired"
                  ? "Request Timed Out"
                  : status === "completed"
                  ? "Clinical Visit Completed!"
                  : status === "cancelled"
                  ? "Visit Cancelled"
                  : phase === "en_route"
                  ? "Van En Route to Location"
                  : phase === "on_site"
                  ? "Van Arrived On Site"
                  : phase === "in_treatment"
                  ? "Appointment In Treatment"
                  : `Accepted · Queue Position #${request?.queuePosition || 1}`}
              </ThemedText>
            </View>

            {!isTerminal && (
              <ThemedText variant="headline" style={styles.etaText}>
                {etaLabel}
              </ThemedText>
            )}
          </View>

          {/* Stepper / Timeline */}
          {!isTerminal && (
            <View style={styles.stepperContainer}>
              {[
                { label: "Request", step: 0 },
                { label: "Queued", step: 1 },
                { label: "Driving", step: 2 },
                { label: "Arrived", step: 3 },
                { label: "Treating", step: 4 },
              ].map((s, idx) => {
                const isPassed = currentStep >= s.step;
                const isCurrent = currentStep === s.step;
                return (
                  <View key={s.step} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        isPassed && styles.stepDotPassed,
                        isCurrent && styles.stepDotCurrent,
                      ]}
                    >
                      <ThemedText
                        variant="caption"
                        style={[styles.stepNum, isPassed && styles.stepNumPassed]}
                      >
                        {idx + 1}
                      </ThemedText>
                    </View>
                    <ThemedText
                      variant="caption"
                      style={[styles.stepLabel, isCurrent && styles.stepLabelCurrent]}
                    >
                      {s.label}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          )}

          {/* Dynamic Instructions */}
          {status === "pending" && (
            <View style={styles.pendingAlertBox}>
              <ThemedText variant="caption" style={styles.pendingText}>
                ⏱{" "}
                <ThemedText variant="caption" style={styles.boldText}>
                  Operator Decision Countdown:
                </ThemedText>{" "}
                {secondsRemaining !== null ? formatTimer(secondsRemaining) : "4:00"}. If the operator cannot take the stop, your request will automatically expire.
              </ThemedText>
            </View>
          )}

          {phase === "en_route" && (
            <View style={styles.infoBox}>
              <ThemedText variant="caption" style={styles.infoText}>
                🚗 Our surgical van is in transit to{" "}
                <ThemedText variant="caption" style={styles.boldText}>
                  {request?.accessDetails?.addressLine1}
                </ThemedText>
                . Please ensure parking access is unobstructed.
              </ThemedText>
            </View>
          )}

          {phase === "on_site" && (
            <View style={styles.infoBox}>
              <ThemedText variant="caption" style={styles.infoText}>
                📍 The van has parked at your property! Please meet the clinician outside or answer buzzer.
              </ThemedText>
            </View>
          )}

          {/* Vehicle & Procedure Details */}
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <ThemedText variant="title">🚐</ThemedText>
            </View>
            <View style={styles.driverInfo}>
              <ThemedText variant="headline" style={styles.driverName}>
                {request?.van?.name || "Pav Dental Mobile Surgery Unit #1"}
              </ThemedText>
              <ThemedText variant="caption" style={styles.driverSub}>
                {request?.service?.name || "Dental Checkup"} · Reg:{" "}
                {request?.van?.registrationPlate || "PV24 DEN"}
              </ThemedText>
            </View>
          </View>

          {/* Action Buttons */}
          {status === "completed" && (
            <Button
              title="View Treatment Summary & Records ›"
              variant="primary"
              onPress={() => router.push("/(patient)/van/complete" as any)}
            />
          )}

          {isTerminal && status !== "completed" && (
            <Button
              title="Return to Home Screen"
              variant="primary"
              onPress={() => router.replace("/(patient)/(tabs)/home")}
            />
          )}

          {canCancel && (
            <Button
              title="Cancel Van Request"
              variant="secondary"
              size="sm"
              loading={cancelMutation.isPending}
              onPress={handleCancel}
            />
          )}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    backgroundColor: colors.systemBackground,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  boldText: {
    color: colors.label,
    fontWeight: "700",
  },
  bottomCard: {
    backgroundColor: colors.systemBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    bottom: 0,
    gap: spacing.sm,
    left: 0,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  centerContainer: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
  },
  container: {
    flex: 1,
  },
  driverAvatar: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  driverInfo: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    color: colors.label,
    fontSize: 15,
  },
  driverRow: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 10,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  driverSub: {
    color: colors.secondaryLabel,
  },
  etaText: {
    color: colors.brand,
    fontWeight: "700",
  },
  homeLabel: {
    color: colors.label,
    fontWeight: "600",
  },
  homeMarker: {
    alignItems: "center",
    bottom: "25%",
    position: "absolute",
    right: "20%",
  },
  infoBox: {
    backgroundColor: colors.brandSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  infoText: {
    color: colors.brand,
    lineHeight: 16,
  },
  loadingText: {
    color: colors.secondaryLabel,
  },
  mapArea: {
    backgroundColor: colors.secondaryBackground,
    flex: 1,
  },
  mapBackground: {
    flex: 1,
    position: "relative",
  },
  pendingAlertBox: {
    backgroundColor: colors.warningSubtle,
    borderRadius: 8,
    padding: spacing.sm,
  },
  pendingText: {
    color: colors.warning,
    lineHeight: 16,
  },
  pulseRing: {
    borderColor: colors.brand,
    borderRadius: 20,
    borderWidth: 2,
    height: 40,
    opacity: 0.5,
    position: "absolute",
    top: -5,
    width: 40,
  },
  routeLine: {
    borderColor: colors.brand,
    borderStyle: "dashed",
    borderWidth: 1.5,
    height: "50%",
    left: "30%",
    position: "absolute",
    top: "25%",
    transform: [{ rotate: "35deg" }],
    width: 2,
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  statusDotRow: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: spacing.xs,
  },
  statusHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusPulse: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  statusTitle: {
    color: colors.label,
    flex: 1,
  },
  stepDot: {
    alignItems: "center",
    backgroundColor: colors.separator,
    borderRadius: 10,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  stepDotCurrent: {
    backgroundColor: colors.brand,
    borderWidth: 2,
    borderColor: colors.onBrand,
  },
  stepDotPassed: {
    backgroundColor: colors.brand,
  },
  stepItem: {
    alignItems: "center",
    gap: 3,
  },
  stepLabel: {
    color: colors.tertiaryLabel,
    fontSize: 10,
  },
  stepLabelCurrent: {
    color: colors.brand,
    fontWeight: "700",
  },
  stepNum: {
    color: colors.onBrand,
    fontSize: 10,
    fontWeight: "700",
  },
  stepNumPassed: {
    color: colors.onBrand,
  },
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
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
    left: "25%",
    position: "absolute",
    top: "30%",
  },
});
