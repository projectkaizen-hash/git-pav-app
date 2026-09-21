import React from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemedText, Card, Badge, Button } from "@/components";
import { colors, spacing } from "@/theme";
import { fetchCurrentShift, updatePhase } from "@/features/van/van-api";
import { VanServiceRequest, VanStopPhase } from "@/features/van/van-types";

export default function OperatorRouteScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["operator-shift"],
    queryFn: fetchCurrentShift,
    refetchInterval: 10000,
  });

  const shift = data?.shift;
  const van = data?.van;
  const queue: VanServiceRequest[] = data?.queue ?? [];

  const phaseMutation = useMutation({
    mutationFn: ({ id, phase }: { id: string; phase: VanStopPhase | "no_show" }) =>
      updatePhase(id, phase),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-shift"] });
    },
    onError: (err: any) => {
      Alert.alert("Phase Update Failed", err.message || "Could not update stop phase");
    },
  });

  const getPhaseBadge = (phase: VanStopPhase) => {
    switch (phase) {
      case "en_route":
        return <Badge label="🚗 EN ROUTE" variant="info" />;
      case "on_site":
        return <Badge label="📍 ON SITE" variant="warning" />;
      case "in_treatment":
        return <Badge label="🦷 IN TREATMENT" variant="success" />;
      default:
        return <Badge label="⏳ QUEUED" variant="default" />;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.vanBadgeRow}>
            <Badge label={van?.name ?? "Live Dispatch"} variant="info" />
            <ThemedText variant="caption" style={styles.shiftText}>
              Status: {shift?.status?.toUpperCase() ?? "OFFLINE"}
            </ThemedText>
          </View>
          <ThemedText variant="largeTitle" style={styles.title}>
            Live Queue ({queue.length} Stop{queue.length !== 1 ? "s" : ""})
          </ThemedText>
        </View>

        {queue.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="headline" style={styles.emptyTitle}>
              No Stops in Queue
            </ThemedText>
            <ThemedText variant="caption" style={styles.emptyBody}>
              Accepted requests will appear here in delivery order.
            </ThemedText>
            <Button
              title="Go to Shift Console"
              variant="secondary"
              onPress={() => router.push("/(operator)/shift" as any)}
            />
          </Card>
        ) : (
          <View style={styles.stopList}>
            {queue.map((s, index) => {
              const isCurrent = index === 0;
              const patientName = `${s.patient?.firstName ?? "Patient"} ${s.patient?.lastName ?? ""}`.trim();
              const address = `${s.accessDetails?.addressLine1}, ${s.accessDetails?.postcode}`;

              return (
                <Card
                  key={s.id}
                  elevation="raised"
                  style={[styles.card, isCurrent && styles.cardNext]}
                >
                  <View style={styles.stopTop}>
                    <View style={styles.stopBadge}>
                      <ThemedText variant="caption" style={styles.stopNum}>
                        STOP #{index + 1}
                      </ThemedText>
                    </View>
                    {getPhaseBadge(s.phase)}
                  </View>

                  <View style={styles.patientInfo}>
                    <ThemedText variant="headline" style={styles.name}>
                      {patientName}
                    </ThemedText>
                    <ThemedText variant="caption" style={styles.address}>
                      📍 {address}
                    </ThemedText>
                    <ThemedText variant="caption" style={styles.parking}>
                      🅿️ {s.accessDetails?.parkingType?.replace("_", " ")}
                      {s.accessDetails?.gateCode ? ` · Gate: ${s.accessDetails.gateCode}` : ""}
                    </ThemedText>
                    <ThemedText variant="caption" style={styles.procedure}>
                      🦷 {s.service?.name} ({s.service?.durationMinutes ?? 45}m block)
                    </ThemedText>
                  </View>

                  {/* Phase Progression Actions (current stop only) */}
                  {isCurrent && (
                    <View style={styles.actionRow}>
                      {s.phase === "queued" && (
                        <Button
                          title="Start Driving (En Route) ›"
                          size="md"
                          loading={phaseMutation.isPending}
                          onPress={() =>
                            phaseMutation.mutate({ id: s.id, phase: "en_route" })
                          }
                        />
                      )}
                      {s.phase === "en_route" && (
                        <Button
                          title="Arrived On Site ›"
                          size="md"
                          loading={phaseMutation.isPending}
                          onPress={() =>
                            phaseMutation.mutate({ id: s.id, phase: "on_site" })
                          }
                        />
                      )}
                      {s.phase === "on_site" && (
                        <Button
                          title="Start Treatment ›"
                          size="md"
                          variant="primary"
                          loading={phaseMutation.isPending}
                          onPress={() =>
                            phaseMutation.mutate({ id: s.id, phase: "in_treatment" })
                          }
                        />
                      )}
                      {s.phase === "in_treatment" && (
                        <Button
                          title="Complete Visit & Add Notes ›"
                          size="md"
                          onPress={() =>
                            router.push({
                              pathname: "/(operator)/offline-capture" as any,
                              params: {
                                stopId: s.id,
                                patientName,
                                procedure: s.service?.name,
                              },
                            })
                          }
                        />
                      )}
                      <Button
                        title="Mark No-Show"
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          Alert.alert(
                            "Mark No-Show",
                            `Mark ${patientName} as no-show? This will remove them from the queue.`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Confirm No-Show",
                                style: "destructive",
                                onPress: () =>
                                  phaseMutation.mutate({ id: s.id, phase: "no_show" }),
                              },
                            ]
                          );
                        }}
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  address: {
    color: colors.secondaryLabel,
  },
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardNext: {
    borderColor: colors.brand,
    borderWidth: 2,
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
  emptyBody: {
    color: colors.secondaryLabel,
    textAlign: "center",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.label,
  },
  header: {
    gap: spacing.xs,
  },
  name: {
    color: colors.label,
  },
  parking: {
    color: colors.secondaryLabel,
  },
  patientInfo: {
    gap: 2,
  },
  procedure: {
    color: colors.brand,
    fontWeight: "600",
    marginTop: 2,
  },
  shiftText: {
    color: colors.secondaryLabel,
  },
  stopBadge: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  stopList: {
    gap: spacing.md,
  },
  stopNum: {
    color: colors.label,
    fontWeight: "700",
  },
  stopTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: colors.label,
  },
  vanBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
