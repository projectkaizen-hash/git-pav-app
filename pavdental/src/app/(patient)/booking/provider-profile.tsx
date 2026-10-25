import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText, Card, Button, AppIcon, ChipPill } from "@/components";
import { colors, spacing, radius } from "@/theme";
import { useClinicians } from "@/features/hooks/use-dental-api";
import { useBookingStore } from "@/features/booking/booking-store";
import { Clinician } from "@/features/booking/booking-types";

// ─── Provider / Clinic profile (Zocdoc provider page pattern) ─────────────────
// Bio + credentials, patient reviews, gallery and insurance accepted. Reached
// from the clinician picker; "Book with…" hands the clinician to the draft.

function Stars({ rating }: { rating: number }) {
  return (
    <View style={styles.starsRow} accessibilityLabel={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <AppIcon
          key={n}
          name="star"
          size={14}
          color={n <= Math.round(rating) ? colors.ink : colors.separator}
        />
      ))}
    </View>
  );
}

export default function ProviderProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const setClinician = useBookingStore((s) => s.setClinician);

  const { data: apiClinicians } = useClinicians();
  const clinicians = (apiClinicians ?? []) as Clinician[];
  const clinician = (id ? clinicians.find((c) => c.id === id) : clinicians[0]) ?? null;
  const reviews: Array<{ id: string; author: string; rating: number; comment: string; dateIso: string }> =
    ((clinician as any)?.reviews as any[]) ?? [];

  if (!clinician) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ThemedText variant="body" style={styles.muted}>
          Practitioner details are unavailable right now.
        </ThemedText>
      </View>
    );
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 5.0;

  const handleBook = () => {
    setClinician(clinician);
    router.push("/(patient)/booking/slot-picker");
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: clinician.fullName,
          headerTitleStyle: { color: colors.label, fontWeight: "700" },
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Identity */}
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <ThemedText variant="title" style={styles.avatarText}>
              {clinician.fullName.replace("Dr ", "").charAt(0)}
            </ThemedText>
          </View>
          <View style={styles.identityInfo}>
            <ThemedText variant="title">{clinician.fullName}</ThemedText>
            <ThemedText variant="caption" style={styles.muted}>
              {clinician.roleTitle} · GDC #{clinician.gdcNumber}
            </ThemedText>
            <View style={styles.ratingRow}>
              <Stars rating={avgRating} />
              <ThemedText variant="caption" style={styles.muted}>
                {avgRating.toFixed(1)} · {reviews.length} reviews
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Bio */}
        <Card style={styles.card}>
          <ThemedText variant="overline">About</ThemedText>
          <ThemedText variant="body" style={styles.bioText}>
            {clinician.bio}
          </ThemedText>
          <View style={styles.chipWrap}>
            {clinician.specialisms.map((spec) => (
              <ChipPill key={spec} label={spec} />
            ))}
          </View>
        </Card>

        {/* Gallery (prototype tiles) */}
        <View style={styles.section}>
          <ThemedText variant="overline">The practice</ThemedText>
          <View style={styles.galleryRow}>
            {["camera", "image", "grid"].map((icon, i) => (
              <View key={i} style={styles.galleryTile}>
                <AppIcon
                  name={icon as "camera" | "image" | "grid"}
                  size={20}
                  color={colors.tertiaryLabel}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Insurance accepted */}
        <Card elevation="flat" style={styles.card}>
          <View style={styles.insuranceRow}>
            <AppIcon name="shield" size={16} color={colors.ink} />
            <ThemedText variant="body" style={styles.insuranceText}>
              Accepts Denplan, Bupa Dental & AXA Health
            </ThemedText>
          </View>
          <ThemedText variant="caption" style={styles.muted}>
            Bring your policy to your first visit — we verify claims before treatment.
          </ThemedText>
        </Card>

        {/* Reviews */}
        <View style={styles.section}>
          <ThemedText variant="overline">Patient reviews</ThemedText>
          {reviews.length === 0 ? (
            <Card elevation="flat" style={styles.reviewCard}>
              <ThemedText variant="caption" style={styles.muted}>
                Verified patient reviews will appear here after completed consultations.
              </ThemedText>
            </Card>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} elevation="flat" style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <ThemedText variant="subhead" style={styles.reviewAuthor}>
                    {review.author}
                  </ThemedText>
                  <Stars rating={review.rating} />
                </View>
                <ThemedText variant="body" style={styles.reviewComment}>
                  {review.comment}
                </ThemedText>
                <ThemedText variant="caption" style={styles.muted}>
                  {new Date(review.dateIso).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </ThemedText>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Sticky book CTA */}
      <View style={[styles.footerBar, { paddingBottom: Math.max(spacing.md, insets.bottom) }]}>
        <Button
          title={`Book with ${clinician.fullName.replace("Dr ", "")}`}
          size="lg"
          onPress={handleBook}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: radius.full,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  avatarText: {
    color: colors.ink,
    fontWeight: "700",
  },
  bioText: {
    color: colors.label,
    lineHeight: 22,
  },
  card: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xxs,
    marginTop: spacing.xxs,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
  },
  footerBar: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
  },
  galleryRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  galleryTile: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderRadius: radius.lg,
    flex: 1,
    height: 84,
    justifyContent: "center",
  },
  identity: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  identityInfo: {
    flex: 1,
    gap: 2,
  },
  insuranceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  insuranceText: {
    color: colors.label,
    fontWeight: "600",
  },
  muted: {
    color: colors.secondaryLabel,
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: 2,
  },
  reviewAuthor: {
    color: colors.label,
    fontWeight: "700",
  },
  reviewCard: {
    backgroundColor: colors.systemBackground,
    gap: spacing.xxs,
    padding: spacing.md,
  },
  reviewComment: {
    color: colors.label,
    lineHeight: 20,
  },
  reviewTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  section: {
    gap: spacing.xs,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
});
