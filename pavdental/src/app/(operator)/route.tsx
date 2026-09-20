import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ThemedText, Card, Badge, Button } from "@/components";
import { colors, spacing } from "@/theme";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function OperatorRouteScreen() {
  const router = useRouter();

  const defaultStops = [
    {
      id: "stop_1",
      time: "09:30 – 11:00 AM",
      patientName: "Alexander Wright",
      address: "14 Harley Street, London, W1G 9PQ",
      parkingType: "Private Driveway · Gate Code #4812",
      procedure: "Comprehensive Exam & AirFlow Hygiene",
      status: "next",
    },
    {
      id: "stop_2",
      time: "12:00 – 01:30 PM",
      patientName: "Michael Chang",
      address: "42 Victoria Street, SW1H 0EU",
      parkingType: "Kerbside Permit Bay",
      procedure: "Composite White Filling (Tooth LR7)",
      status: "scheduled",
    },
    {
      id: "stop_3",
      time: "02:30 – 04:00 PM",
      patientName: "Sarah Robinson",
      address: "15 Millbank, SW1P 4JA",
      parkingType: "Office Visitor Parking",
      procedure: "Teeth Whitening Tray Delivery & Scan",
      status: "scheduled",
    },
  ];

  const { data: apiStops } = useQuery({
    queryKey: ["van-stops"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/van/stops`);
      if (!res.ok) throw new Error("Could not load van stops");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const stops = (apiStops && apiStops.length > 0) ? apiStops : defaultStops;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.vanBadgeRow}>
            <Badge label="Van #1 Live Dispatch" variant="info" />
            <ThemedText variant="caption" style={styles.shiftText}>
              Shift: 08:30 – 17:30 · Westminster Route
            </ThemedText>
          </View>
          <ThemedText variant="largeTitle" style={styles.title}>
            Today's Stops ({stops.length} Visits)
          </ThemedText>
        </View>

        {/* Route Stops */}
        <View style={styles.stopList}>
          {stops.map((s: any, index: number) => {
            const isNext = s.status === "next" || (index === 0 && s.status !== "completed");
            return (
              <Card
                key={s.id}
                elevation="raised"
                style={[styles.card, isNext && styles.cardNext]}
              >
                <View style={styles.stopTop}>
                  <View style={styles.stopBadge}>
                    <ThemedText variant="caption" style={styles.stopNum}>
                      STOP #{index + 1}
                    </ThemedText>
                  </View>
                  <ThemedText variant="headline" style={styles.timeVal}>
                    {s.time}
                  </ThemedText>
                </View>

                <View style={styles.patientInfo}>
                  <ThemedText variant="headline" style={styles.name}>
                    {s.patientName}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.address}>
                    📍 {s.address}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.parking}>
                    🅿️ {s.parkingType}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.procedure}>
                    🦷 {s.procedure}
                  </ThemedText>
                </View>

                {isNext ? (
                  <View style={styles.actionRow}>
                    <Button
                      title="Arrive & Check-In Patient ›"
                      size="md"
                      onPress={() =>
                        router.push({
                          pathname: "/(operator)/check-in" as any,
                          params: {
                            stopId: s.id,
                            patientName: s.patientName,
                            address: s.address,
                            procedure: s.procedure,
                          },
                        })
                      }
                    />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    color: colors.label,
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
  timeVal: {
    color: colors.brand,
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
