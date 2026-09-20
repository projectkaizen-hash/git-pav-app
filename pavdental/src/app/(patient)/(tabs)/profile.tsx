import React from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText, Card, ListRow, Button, Badge } from "@/components";
import { colors, spacing } from "@/theme";
import { useCurrentUser, useAuthStore } from "@/features/auth/auth-store";
import { authApi } from "@/features/auth/auth-api";
import { usePatientProfile } from "@/features/hooks/use-dental-api";

export default function PatientProfileScreen() {
  const router = useRouter();
  const user = useCurrentUser();
  const { clearAuth } = useAuthStore();

  const userId = user?.id || "";
  const { data: profile, isLoading, refetch } = usePatientProfile(userId);

  const handleSignOut = async () => {
    try {
      await authApi.signOut();
    } catch {
      clearAuth();
    }
    router.replace("/(auth)/welcome");
  };

  // Merge auth store user with server profile
  const displayName = profile
    ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim()
    : `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Patient";
  const displayEmail = profile?.email || user?.email || "";
  const displayAddress = profile?.address
    ? [profile.address.line1, profile.address.city, profile.address.postcode].filter(Boolean).join(", ")
    : "";
  const displayPhone = profile?.phone || user?.phone || "";

  const hasMedicalHistory = !!(profile?.medicalHistory && (profile.medicalHistory as any).gpSurgery);
  const hasEmergencyContact = !!profile?.emergencyContact?.name;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.brand} />}
    >
      {/* Profile Header */}
      <View style={styles.userHeader}>
        <View style={styles.avatarCircle}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.brand} />
          ) : (
            <ThemedText variant="title" style={styles.avatarInitial}>
              {(displayName[0] || "P").toUpperCase()}
            </ThemedText>
          )}
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameBadgeRow}>
            <ThemedText variant="headline">{displayName}</ThemedText>
            {user?.emailVerified ? (
              <Badge variant="success" label="Verified" />
            ) : (
              <Badge variant="warning" label="Pending" />
            )}
          </View>
          <ThemedText variant="caption" style={styles.userEmail}>
            {displayEmail}
          </ThemedText>
          {displayPhone ? (
            <ThemedText variant="caption" style={styles.userEmail}>
              {displayPhone}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {/* Live Profile Details Summary Card */}
      {profile && (
        <Card style={styles.profileCard}>
          <View style={styles.detailsHeader}>
            <ThemedText variant="subhead" style={styles.sectionTitle}>
              YOUR DETAILS SUMMARY
            </ThemedText>
            <ThemedText
              variant="caption"
              style={styles.quickEdit}
              onPress={() => router.push("/(patient)/(tabs)/profile/personal-info" as any)}
            >
              Edit Details
            </ThemedText>
          </View>

          {displayAddress ? (
            <View style={styles.detailRow}>
              <ThemedText variant="caption" style={styles.detailLabel}>📍 Address</ThemedText>
              <ThemedText variant="caption" style={styles.detailValue}>{displayAddress}</ThemedText>
            </View>
          ) : null}

          {profile.dob ? (
            <View style={styles.detailRow}>
              <ThemedText variant="caption" style={styles.detailLabel}>🎂 Date of Birth</ThemedText>
              <ThemedText variant="caption" style={styles.detailValue}>
                {new Date(profile.dob).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </ThemedText>
            </View>
          ) : null}

          {profile.emergencyContact?.name ? (
            <View style={styles.detailRow}>
              <ThemedText variant="caption" style={styles.detailLabel}>🆘 Emergency</ThemedText>
              <ThemedText variant="caption" style={styles.detailValue}>
                {profile.emergencyContact.name} · {profile.emergencyContact.phone}
              </ThemedText>
            </View>
          ) : null}
        </Card>
      )}

      {/* Personal & Medical Records */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          PERSONAL & CLINICAL RECORDS
        </ThemedText>
        <Card padding="none">
          <ListRow
            title="Personal Information"
            subtitle="Name, DOB, UK Address, Contact"
            left={<ThemedText>👤</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/(tabs)/profile/personal-info" as any)}
            separator
          />
          <ListRow
            title="Medical History"
            subtitle={hasMedicalHistory ? "Allergies, Medications, GP (Recorded)" : "Allergies, Medications, GP (Incomplete)"}
            left={<ThemedText>🩺</ThemedText>}
            right={
              <View style={styles.rowRight}>
                {hasMedicalHistory ? (
                  <Badge variant="success" label="Complete" />
                ) : (
                  <Badge variant="warning" label="Action Required" />
                )}
                <ThemedText variant="subhead">›</ThemedText>
              </View>
            }
            onPress={() => router.push("/(patient)/(tabs)/profile/medical-history" as any)}
            separator
          />
          <ListRow
            title="Emergency Contact"
            subtitle={hasEmergencyContact ? `${profile?.emergencyContact?.name}` : "Add designated emergency contact"}
            left={<ThemedText>🆘</ThemedText>}
            right={
              <View style={styles.rowRight}>
                {!hasEmergencyContact && <Badge variant="warning" label="Add" />}
                <ThemedText variant="subhead">›</ThemedText>
              </View>
            }
            onPress={() => router.push("/(patient)/(tabs)/profile/emergency-contact" as any)}
            separator
          />
          <ListRow
            title="Dependants & Family"
            subtitle="Manage linked children and permissions"
            left={<ThemedText>👨‍👩‍👦</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/(tabs)/profile/dependants" as any)}
          />
        </Card>
      </View>

      {/* Preferences & Billing */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          PREFERENCES & BILLING
        </ThemedText>
        <Card padding="none">
          <ListRow
            title="Notification Preferences"
            subtitle="Push, SMS, Email & appointment reminders"
            left={<ThemedText>🔔</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/(tabs)/profile/notifications" as any)}
            separator
          />
          <ListRow
            title="Payment Methods"
            subtitle="Manage saved Stripe cards for deposits"
            left={<ThemedText>💳</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/(tabs)/profile/payment-methods" as any)}
          />
        </Card>
      </View>

      {/* Security & GDPR */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          SECURITY & PRIVACY (DSPT)
        </ThemedText>
        <Card padding="none">
          <ListRow
            title="Biometrics & Password"
            subtitle="Face ID, Passwords, Security audit"
            left={<ThemedText>🔐</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/(tabs)/profile/security" as any)}
            separator
          />
          <ListRow
            title="Active Sessions"
            subtitle="Review devices and sign out other sessions"
            left={<ThemedText>📱</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/(tabs)/profile/sessions" as any)}
            separator
          />
          <ListRow
            title="Consent & Data Usage"
            subtitle="View & export signed GDPR records"
            left={<ThemedText>📄</ThemedText>}
            right={<ThemedText variant="subhead">›</ThemedText>}
            onPress={() => router.push("/(patient)/(tabs)/profile/consent" as any)}
          />
        </Card>
      </View>

      {/* Portal Role Switcher */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          PORTAL ROLE SWITCHER (STAFF / DEV)
        </ThemedText>
        <Card padding="none">
          <ListRow
            title="Clinician Practice Portal"
            subtitle="Today's consults, video consult room, EPS"
            left={<ThemedText>🩺</ThemedText>}
            right={<ThemedText variant="subhead">Open ›</ThemedText>}
            onPress={() => router.push("/(clinician)/schedule")}
            separator
          />
          <ListRow
            title="Mobile Van Operator Portal"
            subtitle="Van dispatch route, check-in, offline charting"
            left={<ThemedText>🚐</ThemedText>}
            right={<ThemedText variant="subhead">Open ›</ThemedText>}
            onPress={() => router.push("/(operator)/route")}
          />
        </Card>
      </View>

      {/* Account Actions */}
      <View style={styles.actionGroup}>
        <Button title="Sign Out" variant="secondary" onPress={handleSignOut} />
        <Button
          title="Delete Account"
          variant="destructive"
          onPress={() => router.push("/(patient)/(tabs)/profile/delete-account" as any)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionGroup: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  avatarCircle: {
    alignItems: "center",
    backgroundColor: colors.brandSubtle,
    borderRadius: 30,
    height: 60,
    justifyContent: "center",
    width: 60,
  },
  avatarInitial: {
    color: colors.brand,
    fontWeight: "700",
  },
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  detailLabel: {
    color: colors.secondaryLabel,
    fontWeight: "600",
    minWidth: 100,
  },
  detailRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  detailValue: {
    color: colors.label,
    flex: 1,
    textAlign: "right",
  },
  detailsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  nameBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  profileCard: {
    backgroundColor: colors.secondaryBackground,
    gap: spacing.sm,
    padding: spacing.md,
  },
  quickEdit: {
    color: colors.brand,
    fontWeight: "600",
  },
  rowRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    color: colors.secondaryLabel,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  userEmail: {
    color: colors.secondaryLabel,
  },
  userHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
});
