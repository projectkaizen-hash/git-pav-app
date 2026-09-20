import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { useServices } from "@/features/hooks/use-dental-api";
import { formatGbp } from "@/features/booking/booking-api";
import { useBookingStore } from "@/features/booking/booking-store";
import { DentalService } from "@/features/booking/booking-types";


type CategoryFilter = "all" | "checkup" | "hygiene" | "emergency" | "restorative" | "cosmetic";

export default function ServiceCatalogScreen() {
  const router = useRouter();
  const { setService, setChannel } = useBookingStore();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");

  const { data: apiServices } = useServices();
  const services = apiServices || [];

  const filteredServices = services.filter((s) => {
    if (selectedCategory === "all") return true;
    return s.category === selectedCategory;
  });

  const handleSelectService = (service: DentalService) => {
    setService(service);
    setChannel("clinic");
    router.push("/(patient)/booking/clinic-picker" as any);
  };

  const categories: { label: string; value: CategoryFilter }[] = [
    { label: "All Treatments", value: "all" },
    { label: "Checkups", value: "checkup" },
    { label: "Hygiene", value: "hygiene" },
    { label: "Emergency", value: "emergency" },
    { label: "Fillings", value: "restorative" },
    { label: "Whitening", value: "cosmetic" },
  ];

  return (
    <View style={styles.container}>
      {/* Category Horizontal Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {categories.map((cat) => {
            const active = selectedCategory === cat.value;
            return (
              <Pressable
                key={cat.value}
                onPress={() => setSelectedCategory(cat.value)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <ThemedText
                  variant="caption"
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
                  {cat.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Services List */}
      <ScrollView contentContainerStyle={styles.serviceList}>
        {filteredServices.map((srv) => (
          <Pressable
            key={srv.id}
            onPress={() => handleSelectService(srv)}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <Card elevation="raised" style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleArea}>
                  <ThemedText variant="headline" style={styles.serviceName}>
                    {srv.name}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.duration}>
                    ⏱ {srv.durationMinutes} mins
                  </ThemedText>
                </View>
                <View style={styles.priceArea}>
                  <ThemedText variant="mono" style={styles.price}>
                    {formatGbp(srv.pricePence)}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.deposit}>
                    Dep: {formatGbp(srv.depositPence)}
                  </ThemedText>
                </View>
              </View>

              <ThemedText variant="subhead" style={styles.desc}>
                {srv.description}
              </ThemedText>

              <View style={styles.footerRow}>
                <View style={styles.badgeRow}>
                  {srv.supportedChannels.map((ch) => (
                    <Badge
                      key={ch}
                      label={ch.toUpperCase()}
                      variant={ch === "van" ? "success" : ch === "video" ? "info" : "default"}
                    />
                  ))}
                </View>
                <ThemedText variant="caption" style={styles.selectCta}>
                  Select ›
                </ThemedText>
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: "row",
    gap: 4,
  },
  card: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  deposit: {
    color: colors.secondaryLabel,
    fontSize: 11,
  },
  desc: {
    color: colors.secondaryLabel,
    fontSize: 13,
    lineHeight: 18,
  },
  duration: {
    color: colors.secondaryLabel,
  },
  filterContainer: {
    backgroundColor: colors.systemBackground,
    borderBottomColor: colors.separator,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterScroll: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  footerRow: {
    alignItems: "center",
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  pill: {
    backgroundColor: colors.secondaryBackground,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  pillActive: {
    backgroundColor: colors.brand,
  },
  pillText: {
    color: colors.label,
    fontWeight: "600",
  },
  pillTextActive: {
    color: colors.onBrand,
  },
  price: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: "700",
  },
  priceArea: {
    alignItems: "flex-end",
  },
  selectCta: {
    color: colors.brand,
    fontWeight: "700",
  },
  serviceList: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  serviceName: {
    color: colors.label,
  },
  titleArea: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
});

