import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import {
  ThemedText,
  Card,
  Button,
  AppIcon,
  ServiceHeroCard,
  EmergencyTriageModal,
  ErrorState,
  type AppIconName,
} from "@/components";
import { colors, spacing, radius } from "@/theme";
import { useCurrentUser } from "@/features/auth/auth-store";
import { fetchActiveVanRequest } from "@/features/van/van-api";
import { useBookingStore } from "@/features/booking/booking-store";
import { useServices, useRewards } from "@/features/hooks/use-dental-api";
import { DentalService } from "@/features/booking/booking-types";
import { formatGbp } from "@/features/booking/booking-api";

type CategoryKey = "all" | "checkup" | "hygiene" | "emergency" | "restorative" | "cosmetic";

interface CategoryFilter {
  key: CategoryKey;
  label: string;
  icon: AppIconName;
}

const CATEGORIES: CategoryFilter[] = [
  { key: "all", label: "All", icon: "grid" },
  { key: "checkup", label: "Checkup", icon: "profile" },
  { key: "hygiene", label: "Hygiene", icon: "sparkle" },
  { key: "emergency", label: "Emergency", icon: "alert" },
  { key: "restorative", label: "Surgery", icon: "activity" },
  { key: "cosmetic", label: "Aesthetics", icon: "smile" },
];

function getHeroImage(category?: string, name?: string) {
  const lower = `${category || ""} ${name || ""}`.toLowerCase();
  if (lower.includes("implant") || lower.includes("restor") || lower.includes("emerg")) {
    return require("../../../../assets/images/implant.jpg");
  }
  return require("../../../../assets/images/smile-restoration.jpg");
}

export default function PatientHomeScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const { setService } = useBookingStore();
  const params = useLocalSearchParams<{ triageModal?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);

  // Services and points come only from the API: no fallback catalogue, prices
  // or points balance (MC-4).
  const { data: apiServices, isError: servicesError, refetch: refetchServices } = useServices();
  const { data: rewards } = useRewards();
  const pointsBalance: number | undefined = (rewards as any)?.pointsBalance;

  useEffect(() => {
    if (params.triageModal === "true") {
      setShowEmergencyModal(true);
    }
  }, [params.triageModal]);

  const { data: activeVanRequest } = useQuery({
    queryKey: ["active-van-request"],
    queryFn: fetchActiveVanRequest,
    refetchInterval: 10000,
  });

  const userName = user?.firstName || "Patient";
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const displayedServices = useMemo(() => {
    const source: DentalService[] = Array.isArray(apiServices) ? (apiServices as DentalService[]) : [];
    if (selectedCategory === "all") return source;
    return source.filter(
      (s) => (s.category || "").toLowerCase() === selectedCategory
    );
  }, [apiServices, selectedCategory]);

  const handleBookService = (srv: DentalService) => {
    setService({
      ...srv,
      id: srv.id,
      name: srv.name,
      pricePence: srv.pricePence,
      depositPence: srv.depositPence ?? Math.round((srv.pricePence || 0) * 0.25),
    });
    router.push("/(patient)/booking/clinic-picker" as never);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Row: Avatar + Greeting + Notification Bell */}
      <View style={styles.topBar}>
        <View style={styles.userRow}>
          <Image
            source={require("../../../../assets/images/avatar.jpg")}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.userTextGroup}>
            <ThemedText variant="caption" style={styles.greetingCaption}>
              {greeting}
            </ThemedText>
            <ThemedText variant="headline" style={styles.userName}>
              {userName}
            </ThemedText>
          </View>
        </View>

        <View style={styles.topRightActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rewards & Perks"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push("/(patient)/perks" as never);
            }}
            style={({ pressed }) => [styles.pointsPill, pressed && { opacity: 0.8 }]}
          >
            <AppIcon name="sparkles" size={13} color="#F59E0B" />
            <ThemedText variant="caption" style={styles.pointsText}>
              {typeof pointsBalance === "number" ? `${pointsBalance.toLocaleString("en-GB")} pts` : "Perks"}
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              router.push("/(patient)/(tabs)/messages" as never);
            }}
            style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.7 }]}
          >
            <AppIcon name="bell" size={18} color={colors.ink} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>
      </View>

      {/* Screen Title */}
      <View style={styles.titleSection}>
        <ThemedText variant="largeTitle" style={styles.mainTitle}>
          Select Your{"\n"}Preferred Service
        </ThemedText>
      </View>

      {/* Horizontal Category Filter Pills (Reference 1 & 2) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              accessibilityRole="button"
              accessibilityLabel={cat.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setSelectedCategory(cat.key);
              }}
              style={({ pressed }) => [
                styles.categoryPill,
                isActive ? styles.categoryPillActive : styles.categoryPillInactive,
                pressed && { opacity: 0.8 },
              ]}
            >
              <AppIcon
                name={cat.icon}
                size={14}
                color={isActive ? colors.alwaysWhite : colors.ink}
              />
              <ThemedText
                variant="subhead"
                style={[
                  styles.categoryText,
                  isActive ? styles.categoryTextActive : styles.categoryTextInactive,
                ]}
              >
                {cat.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Active Van Dispatch banner (if running) */}
      {activeVanRequest && (
        <Card elevation="raised" style={styles.dispatchCard}>
          <View style={styles.dispatchHeader}>
            <View style={styles.dispatchTitleRow}>
              <View style={styles.liveDot} />
              <ThemedText variant="headline" style={styles.dispatchTitle}>
                Van Visit {activeVanRequest.phase?.replace("_", " ") || "En Route"}
              </ThemedText>
            </View>
            {activeVanRequest.etaLabel ? (
              <ThemedText variant="mono" style={styles.dispatchEta}>
                {activeVanRequest.etaLabel}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText variant="subhead" style={styles.dispatchSub}>
            {activeVanRequest.service?.name} · {activeVanRequest.accessDetails?.addressLine1}
          </ThemedText>
          <Button
            title="Track live on map"
            variant="secondary"
            size="sm"
            onPress={() =>
              router.push({
                pathname: "/(patient)/van/live-track" as never,
                params: { requestId: activeVanRequest.id },
              })
            }
            style={styles.dispatchCta}
          />
        </Card>
      )}

      {/* Hero Visual Service Cards (Filtered by Category) */}
      {servicesError ? (
        <ErrorState message="We couldn't load our services. Please try again." onRetry={() => refetchServices()} />
      ) : null}
      <View style={styles.serviceStack}>
        {displayedServices.map((srv) => (
          <ServiceHeroCard
            key={srv.id}
            title={srv.name}
            badge={`${(srv.category || "CLINICAL").toUpperCase()} · ${formatGbp(srv.pricePence || 0)}`}
            image={getHeroImage(srv.category, srv.name)}
            actionLabel="Book Appointment"
            onPressAction={() => handleBookService(srv)}
            onPressChat={() => router.push("/(patient)/(tabs)/messages" as never)}
            onPressInfo={() => router.push("/(patient)/booking/service-catalog" as never)}
          />
        ))}
      </View>

      {/* Quick Action Tiles: Video Triage & 3D Chart */}
      <View style={styles.quickGrid}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Speak to a dentist via video"
          onPress={() => router.push("/(patient)/video/intake" as never)}
          style={({ pressed }) => [styles.quickTile, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.quickIconWrap}>
            <AppIcon name="video" size={20} color={colors.ink} />
          </View>
          <ThemedText variant="headline" style={styles.quickTitle}>
            Video Consult
          </ThemedText>
          <ThemedText variant="caption" style={styles.quickSub}>
            Speak to a dentist by video
          </ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View 3D Clean Progress Chart"
          onPress={() => router.push("/(patient)/records/odontogram" as never)}
          style={({ pressed }) => [styles.quickTile, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.quickIconWrap}>
            <AppIcon name="activity" size={20} color={colors.ink} />
          </View>
          <ThemedText variant="headline" style={styles.quickTitle}>
            Clean Progress
          </ThemedText>
          <ThemedText variant="caption" style={styles.quickSub}>
            3D Dental arch & gauges
          </ThemedText>
        </Pressable>
      </View>

      {/* Emergency triage card (Frame 6) */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Emergency dental triage"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          setShowEmergencyModal(true);
        }}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <Card style={styles.emergencyCard}>
          <View style={styles.emergencyIconWrap}>
            <AppIcon name="alert" size={18} color={colors.danger} />
          </View>
          <View style={styles.emergencyTextWrap}>
            <View style={styles.emergencyHeaderRow}>
              <ThemedText variant="headline" style={styles.emergencyTitle}>
                Severe pain or acute swelling?
              </ThemedText>
            </View>
            <ThemedText variant="caption" style={styles.emergencySub}>
              Answer a few questions to see where to get help and find urgent appointments.
            </ThemedText>
          </View>
        </Card>
      </Pressable>

      {/* Emergency triage modal */}
      <EmergencyTriageModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.inkSubtle,
    borderRadius: radius.full,
    height: 44,
    width: 44,
  },
  topRightActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  pointsPill: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pointsText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  bellBtn: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    position: "relative",
    width: 42,
  },
  bellDot: {
    backgroundColor: colors.danger,
    borderColor: colors.systemBackground,
    borderRadius: 4,
    borderWidth: 1.5,
    height: 8,
    position: "absolute",
    right: 10,
    top: 10,
    width: 8,
  },
  categoryPill: {
    alignItems: "center",
    borderRadius: radius.full,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  categoryPillActive: {
    backgroundColor: colors.ink,
  },
  categoryPillInactive: {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderWidth: 1,
  },
  categoryScroll: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  categoryTextActive: {
    color: colors.alwaysWhite,
  },
  categoryTextInactive: {
    color: colors.label,
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  dispatchCard: {
    backgroundColor: colors.ink,
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  dispatchCta: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  dispatchEta: {
    color: colors.alwaysWhite,
  },
  dispatchHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dispatchSub: {
    color: colors.alwaysWhite,
    opacity: 0.75,
  },
  dispatchTitle: {
    color: colors.alwaysWhite,
  },
  dispatchTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  emergencyCard: {
    alignItems: "center",
    backgroundColor: colors.dangerSubtle,
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  emergencyHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emergencyIconWrap: {
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: radius.full,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  emergencySub: {
    color: colors.danger,
    opacity: 0.85,
  },
  emergencyTextWrap: {
    flex: 1,
    gap: 2,
  },
  emergencyTitle: {
    color: colors.danger,
    fontSize: 14,
  },
  greetingCaption: {
    color: colors.secondaryLabel,
    fontSize: 12,
  },
  liveDot: {
    backgroundColor: colors.success,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  mainTitle: {
    color: colors.label,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  quickGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  quickIconWrap: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderRadius: radius.md,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  quickSub: {
    color: colors.secondaryLabel,
    fontSize: 12,
  },
  quickTile: {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  quickTitle: {
    color: colors.label,
    fontSize: 15,
  },
  serviceStack: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  titleSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  userName: {
    color: colors.label,
    fontSize: 18,
    fontWeight: "700",
  },
  userRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  userTextGroup: {
    gap: 1,
  },
});
