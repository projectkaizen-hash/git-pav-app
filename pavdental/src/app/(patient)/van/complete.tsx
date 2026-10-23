import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ThemedText, Card, Button, AppIcon } from "@/components";
import { colors, spacing } from "@/theme";
import { fetchVanRequest, fetchActiveVanRequest } from "@/features/van/van-api";
import { formatGbp } from "@/features/booking/booking-api";

export default function VanCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();

  const { data: request } = useQuery({
    queryKey: ["van-request-complete", params.requestId],
    queryFn: () =>
      params.requestId
        ? fetchVanRequest(params.requestId)
        : fetchActiveVanRequest(),
  });

  const serviceName = request?.service?.name || "Mobile Surgery Consultation";
  const priceLabel =
    request?.service?.pricePence != null
      ? formatGbp(request.service.pricePence)
      : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.centerHeader}>
            <View style={styles.checkCircle}>
              <AppIcon name="checkCircle" size={36} color={colors.success} />
            </View>
            <ThemedText variant="largeTitle" style={styles.title}>
              Van Visit Complete!
            </ThemedText>
            <ThemedText variant="subhead" style={styles.subtitle}>
              Thank you for trusting Pav Dental. Your driveway clinical visit has finished and your digital records are updated.
            </ThemedText>
          </View>

          {/* Treatment Performed Card */}
          <Card elevation="raised" style={styles.card}>
            <ThemedText variant="headline" style={styles.cardTitle}>
              Procedures Completed On Board
            </ThemedText>
            <View style={styles.treatmentRow}>
              <AppIcon name="check" size={15} color={colors.success} />
              <ThemedText variant="body" style={styles.treatmentName}>
                {serviceName}
              </ThemedText>
              <ThemedText variant="caption" style={styles.okTag}>
                {priceLabel ? `${priceLabel} · Done` : "Done"}
              </ThemedText>
            </View>
            <View style={styles.treatmentRow}>
              <AppIcon name="check" size={15} color={colors.success} />
              <ThemedText variant="body" style={styles.treatmentName}>Dental examination & gum check</ThemedText>
              <ThemedText variant="caption" style={styles.okTag}>Done</ThemedText>
            </View>
            <View style={styles.treatmentRow}>
              <AppIcon name="check" size={15} color={colors.success} />
              <ThemedText variant="body" style={styles.treatmentName}>Digital clinical notes & charting</ThemedText>
              <ThemedText variant="caption" style={styles.okTag}>Done</ThemedText>
            </View>
          </Card>

          {/* Digital Vault Notice */}
          <Card elevation="raised" style={styles.card}>
            <ThemedText variant="headline" style={styles.cardTitle}>
              Post-Care & Records
            </ThemedText>
            <ThemedText variant="caption" style={styles.sub}>
              Your dental radiographs and odontogram chart are now available in your encrypted Records tab. A full VAT invoice has been sent to your email.
            </ThemedText>
          </Card>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="View Updated Dental Records"
            size="lg"
            onPress={() => router.replace("/(patient)/(tabs)/records")}
          />
          <Button
            title="Back to Home"
            variant="ghost"
            size="md"
            onPress={() => router.replace("/(patient)/(tabs)/home")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.label,
    marginBottom: spacing.xxs,
  },
  centerHeader: {
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  checkCircle: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 40,
    height: 80,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 80,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  footer: {
    backgroundColor: colors.systemBackground,
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  okTag: {
    color: colors.success,
    fontWeight: "700",
  },
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  sub: {
    color: colors.secondaryLabel,
    lineHeight: 18,
  },
  subtitle: {
    color: colors.secondaryLabel,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    textAlign: "center",
  },
  title: {
    color: colors.label,
    textAlign: "center",
  },
  treatmentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 2,
  },
  treatmentName: {
    flex: 1,
  },
});

