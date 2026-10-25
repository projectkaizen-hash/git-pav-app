import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, Badge, AppIcon, ProgressPills, QueryState, IconButton } from "@/components";
import { colors, spacing } from "@/theme";
import { useBookingStore } from "@/features/booking/booking-store";
import { Clinician } from "@/features/booking/booking-types";
import { useClinicians } from "@/features/hooks/use-dental-api";

export default function ClinicianPickerScreen() {
  const router = useRouter();
  const { setClinician, clinic } = useBookingStore();

  const { data: apiClinicians, isLoading, isError, refetch } = useClinicians();
  const clinicians = (apiClinicians ?? []) as Clinician[];

  const handleSelectClinician = (clinician: Clinician | null) => {
    setClinician(clinician);
    router.push("/(patient)/booking/slot-picker" as any);
  };

  const eligibleClinicians = clinicians.filter((doc) => {
    if (!clinic) return true;
    return doc.clinicIds ? doc.clinicIds.includes(clinic.id) : true;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topNav}>
        <IconButton
          icon="chevronLeft"
          label="Go back"
          variant="soft"
          size={18}
          onPress={() => router.back()}
        />
        <View style={styles.progressWrap}>
          <ProgressPills total={5} current={3} />
        </View>
      </View>

      <View style={styles.header}>
        <ThemedText variant="largeTitle" style={styles.title}>
          Select a Practitioner
        </ThemedText>
        <ThemedText variant="subhead" style={styles.sub}>
          Or choose 'First Available' for the earliest appointment slot.
        </ThemedText>
      </View>

      {/* First Available Option */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Any available clinician"
        onPress={() => handleSelectClinician(null)}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        <Card style={styles.anyCard}>
          <View style={styles.anyIcon}>
            <AppIcon name="zap" size={20} color={colors.ink} />
          </View>
          <View style={styles.anyInfo}>
            <ThemedText variant="headline" style={styles.anyTitle}>
              Any Practitioner (First Available)
            </ThemedText>
            <ThemedText variant="caption" style={styles.anySub}>
              Recommended for urgent care or fastest booking dates.
            </ThemedText>
          </View>
          <AppIcon name="chevronRight" size={16} color={colors.tertiaryLabel} />
        </Card>
      </Pressable>

      {/* Clinicians List */}
      <QueryState
        isLoading={isLoading}
        isError={isError}
        data={apiClinicians === undefined ? undefined : eligibleClinicians}
        onRetry={() => refetch()}
        errorMessage="We couldn't load the clinicians. You can still choose Any Practitioner above, or try again."
        emptyHeading="No specific clinicians listed"
        emptyBody="Choose 'Any Practitioner (First Available)' above to see open slots."
        emptyIcon="profile"
      >
        {(list) => (
          <View style={styles.clinicianList}>
            {list.map((doc) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={doc.fullName}
                key={doc.id}
                onPress={() => handleSelectClinician(doc)}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <Card style={styles.card}>
                  <View style={styles.docRow}>
                    <View style={styles.avatar}>
                      <ThemedText variant="headline" style={styles.avatarText}>
                        {doc.fullName[3] || "D"}
                      </ThemedText>
                    </View>
                    <View style={styles.docInfo}>
                      <ThemedText variant="headline" style={styles.name}>
                        {doc.fullName}
                      </ThemedText>
                      <ThemedText variant="caption" style={styles.role}>
                        {doc.roleTitle} · GDC: #{doc.gdcNumber}
                      </ThemedText>
                      <ThemedText variant="caption" style={styles.bio} numberOfLines={2}>
                        {doc.bio}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.specialismsRow}>
                    {(doc.specialisms || []).map((spec) => (
                      <Badge key={spec} label={spec} variant="default" />
                    ))}
                  </View>

                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`View full profile for ${doc.fullName}`}
                    onPress={() =>
                      router.push({
                        pathname: "/(patient)/booking/provider-profile" as never,
                        params: { id: doc.id },
                      })
                    }
                    style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                  >
                    <View style={styles.profileLink}>
                      <ThemedText variant="caption" style={styles.profileLinkText}>
                        View profile & reviews
                      </ThemedText>
                      <AppIcon name="chevronRight" size={13} color={colors.ink} />
                    </View>
                  </Pressable>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </QueryState>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  anyCard: {
    alignItems: "center",
    backgroundColor: colors.secondaryBackground,
    borderRadius: 20,
    borderColor: colors.separator,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  anyIcon: {
    alignItems: "center",
    backgroundColor: colors.systemBackground,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  anyInfo: {
    flex: 1,
    gap: 2,
  },
  anySub: {
    color: colors.secondaryLabel,
  },
  anyTitle: {
    color: colors.ink,
    fontWeight: "600",
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: colors.ink,
    fontWeight: "700",
  },
  bio: {
    color: colors.secondaryLabel,
    lineHeight: 16,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.systemBackground,
    borderRadius: 20,
    borderColor: colors.separator,
    gap: spacing.sm,
    padding: spacing.md,
  },
  clinicianList: {
    gap: spacing.md,
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
  docInfo: {
    flex: 1,
    gap: 2,
  },
  docRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  header: {
    gap: spacing.xxs,
    marginBottom: spacing.xs,
  },
  name: {
    color: colors.label,
    fontWeight: "600",
  },
  profileLink: {
    alignItems: "center",
    borderTopColor: colors.separator,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  profileLinkText: {
    color: colors.ink,
    fontWeight: "600",
  },
  progressWrap: {
    flex: 1,
    marginLeft: spacing.md,
  },
  role: {
    color: colors.secondaryLabel,
  },
  specialismsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xxs,
  },
  sub: {
    color: colors.secondaryLabel,
  },
  title: {
    color: colors.label,
    fontWeight: "700",
  },
  topNav: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
});
