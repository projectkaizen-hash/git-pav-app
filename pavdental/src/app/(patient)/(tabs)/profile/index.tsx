import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ThemedText,
  Card,
  ListRow,
  Avatar,
  AppIcon,
  Badge,
  Button,
  IconButton,
  ConfirmSheet,
  type AppIconName,
} from "@/components";
import { colors, spacing } from "@/theme";
import { authApi } from "@/features/auth/auth-api";
import { useAuthStore } from "@/features/auth/auth-store";

// ─── Profile hub — the single settings surface (absorbed the old Account tab) ──
// Identity on top, grouped disclosure below (progressive-disclosure pattern).

interface MenuRow {
  title: string;
  subtitle?: string;
  icon: AppIconName;
  route: string;
}

const groups: { heading: string; rows: MenuRow[] }[] = [
  {
    heading: "Account",
    rows: [
      {
        title: "Personal Information",
        icon: "profile",
        route: "/(patient)/(tabs)/profile/personal-info",
      },
      {
        title: "Medical History",
        icon: "clipboard",
        route: "/(patient)/(tabs)/profile/medical-history",
      },
      {
        title: "Emergency Contact",
        icon: "heart",
        route: "/(patient)/(tabs)/profile/emergency-contact",
      },
      {
        title: "Dependants & Family",
        icon: "users",
        route: "/(patient)/(tabs)/profile/dependants",
      },
    ],
  },
  {
    heading: "Preferences",
    rows: [
      {
        title: "Notification Preferences",
        icon: "bell",
        route: "/(patient)/(tabs)/profile/notifications",
      },
      {
        title: "Payment Methods",
        icon: "creditCard",
        route: "/(patient)/(tabs)/profile/payment-methods",
      },
    ],
  },
  {
    heading: "Security & Privacy",
    rows: [
      {
        title: "Security & Privacy",
        icon: "lock",
        route: "/(patient)/(tabs)/profile/security",
      },
      {
        title: "Active Sessions",
        icon: "smartphone",
        route: "/(patient)/(tabs)/profile/sessions",
      },
      {
        title: "Consent & GDPR",
        icon: "shield",
        route: "/(patient)/(tabs)/profile/consent",
      },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your account";

  const handleSignOut = async () => {
    try {
      await authApi.signOut();
    } catch {
      // clearAuth is called inside signOut regardless — safe to ignore network errors
    }
  };

  const renderGroup = (heading: string, rows: MenuRow[]) => (
    <View key={heading} style={styles.group}>
      <ThemedText variant="overline" style={styles.groupHeading}>
        {heading}
      </ThemedText>
      <Card padding="none">
        {rows.map((row, i) => (
          <ListRow
            key={row.route}
            title={row.title}
            left={
              <View style={styles.rowIcon}>
                <AppIcon name={row.icon} size={18} color={colors.ink} />
              </View>
            }
            right={<AppIcon name="chevronRight" size={16} color={colors.tertiaryLabel} />}
            onPress={() => router.push(row.route as never)}
            separator={i < rows.length - 1}
          />
        ))}
      </Card>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Neo Financial Top Header with Circular Close Button */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <ThemedText variant="largeTitle">Profile</ThemedText>
            <ThemedText variant="subhead" style={styles.headerSub}>
              Manage your details and preferences
            </ThemedText>
          </View>
          <IconButton
            icon="close"
            label="Close profile"
            variant="soft"
            size={18}
            onPress={() => router.back()}
          />
        </View>

        {/* Identity card — edit target is Personal Information */}
        <Card padding="none" style={styles.identityCard}>
          <ListRow
            title={displayName}
            subtitle={user?.email}
            left={<Avatar name={displayName} size="lg" />}
            right={<AppIcon name="chevronRight" size={16} color={colors.tertiaryLabel} />}
            onPress={() => router.push("/(patient)/(tabs)/profile/personal-info" as never)}
            style={styles.identityRow}
          />
        </Card>

        {/* Neo Financial Two-Column Refer & Earn Promo Banner (Screen_455_Settings & Preferences.png) */}
        <Card style={styles.promoCard}>
          <View style={styles.promoRow}>
            <View style={styles.promoContent}>
              <ThemedText variant="headline" style={styles.promoTitle}>
                Refer friends, earn £20
              </ThemedText>
              <ThemedText variant="caption" style={styles.promoSub}>
                Share your invite link with family and receive £20 towards treatments.
              </ThemedText>
              <Button
                title="Share link"
                size="sm"
                arrow
                onPress={() => router.push("/(patient)/perks" as never)}
                style={styles.promoBtn}
              />
            </View>
            <View style={styles.promoBadgeSquare}>
              <AppIcon name="sparkles" size={26} color="#D97706" />
            </View>
          </View>
        </Card>

        {groups.map((g) => renderGroup(g.heading, g.rows))}

        {/* Portal Role Switcher (development opt-in only) */}
        {__DEV__ && process.env.EXPO_PUBLIC_ENABLE_ROLE_SWITCHER === "true" ? (
          <View style={styles.group}>
            <ThemedText variant="overline" style={styles.groupHeading}>
              Switch App Role (Demo & Verification)
            </ThemedText>
            <Card padding="none">
              <ListRow
                title="Clinician Portal (Dentist)"
                subtitle="Schedule, tooth chart and prescriptions"
                left={
                  <View style={styles.rowIcon}>
                    <AppIcon name="userCheck" size={18} color={colors.ink} />
                  </View>
                }
                right={<Badge label="Clinician" variant="info" />}
                onPress={() => {
                  useAuthStore.getState().updateUser({
                    role: "clinician",
                    email: "clinician@example.test",
                    firstName: "Demo",
                    lastName: "Clinician",
                  });
                  router.replace("/(clinician)/schedule" as any);
                }}
                separator
              />
              <ListRow
                title="Mobile Van Operator Portal"
                subtitle="Unit 01 Dispatch · Real-time Stops, En Route & On-Site Triage"
                left={
                  <View style={styles.rowIcon}>
                    <AppIcon name="navigation" size={18} color={colors.ink} />
                  </View>
                }
                right={<Badge label="Operator" variant="warning" />}
                onPress={() => {
                  useAuthStore.getState().updateUser({
                    role: "operator",
                    email: "operator@example.test",
                    firstName: "Test",
                    lastName: "Operator",
                  });
                  router.replace("/(operator)/route" as any);
                }}
              />
            </Card>
          </View>
        ) : null}

        {/* Danger zone */}
        <View style={styles.group}>
          <ThemedText variant="overline" style={styles.groupHeading}>
            Danger zone
          </ThemedText>
          <Card padding="none">
            <ListRow
              title="Sign Out"
              left={
                <View style={styles.rowIcon}>
                  <AppIcon name="logOut" size={18} color={colors.label} />
                </View>
              }
              onPress={() => setConfirmSignOut(true)}
              separator
            />
            <ListRow
              title="Delete Account"
              subtitle="Permanently remove your account and data"
              left={
                <View style={[styles.rowIcon, styles.rowIconDanger]}>
                  <AppIcon name="trash" size={18} color={colors.danger} />
                </View>
              }
              onPress={() => router.push("/(patient)/(tabs)/profile/delete-account" as never)}
            />
          </Card>
        </View>
      </ScrollView>

      {confirmSignOut ? (
        <ConfirmSheet
          title="Sign out?"
          message="You will need to sign in again to access your appointments and records. This device will be remembered."
          confirmLabel="Sign Out"
          cancelLabel="Stay Signed In"
          variant="destructive"
          onConfirm={() => {
            setConfirmSignOut(false);
            handleSignOut();
          }}
          onCancel={() => setConfirmSignOut(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTextWrap: {
    gap: spacing.xxs,
  },
  headerSub: {
    color: colors.secondaryLabel,
  },
  identityCard: {
    borderRadius: 20,
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.separator,
  },
  identityRow: {
    paddingVertical: spacing.sm,
  },
  promoCard: {
    borderRadius: 20,
    backgroundColor: colors.systemBackground,
    borderColor: colors.separator,
    padding: spacing.md,
  },
  promoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promoContent: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.sm,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.label,
  },
  promoSub: {
    color: colors.secondaryLabel,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: spacing.xs,
  },
  promoBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
  },
  promoBadgeSquare: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  group: {
    gap: spacing.xxs,
  },
  groupHeading: {
    marginLeft: spacing.xxs,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.inkSubtle,
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  rowIconDanger: {
    backgroundColor: colors.dangerSubtle,
  },
});
