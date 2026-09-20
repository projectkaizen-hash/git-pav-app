import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components";
import { colors } from "@/theme";
import { authApi } from "@/features/auth/auth-api";

export default function AccountTab() {
  const router = useRouter();

  const menuItems = [
    { id: "personal-info", title: "Personal Information", icon: "👤", route: "/(patient)/(tabs)/profile/personal-info" },
    { id: "medical-history", title: "Medical History", icon: "🏥", route: "/(patient)/(tabs)/profile/medical-history" },
    { id: "emergency-contact", title: "Emergency Contact", icon: "🆘", route: "/(patient)/(tabs)/profile/emergency-contact" },
    { id: "security", title: "Security & Privacy", icon: "🔒", route: "/(patient)/(tabs)/profile/security" },
    { id: "sessions", title: "Active Sessions", icon: "💻", route: "/(patient)/(tabs)/profile/sessions" },
    { id: "consent", title: "Consent & GDPR", icon: "📄", route: "/(patient)/(tabs)/profile/consent" },
    { id: "notifications", title: "Notification Preferences", icon: "🔔", route: "/(patient)/(tabs)/profile/notifications" },
    { id: "payment-methods", title: "Payment Methods", icon: "💳", route: "/(patient)/(tabs)/profile/payment-methods" },
    { id: "dependants", title: "Dependants & Family", icon: "👨‍👩‍👧‍👦", route: "/(patient)/(tabs)/profile/dependants" },
  ];

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await authApi.signOut();
            } catch {
              // clearAuth is called inside signOut regardless — safe to ignore network errors
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Account Settings</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Manage your account preferences</ThemedText>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <ThemedText style={styles.menuIcon}>{item.icon}</ThemedText>
              <ThemedText style={styles.menuTitle}>{item.title}</ThemedText>
              <ThemedText style={styles.menuArrow}>›</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <ThemedText style={styles.signOutIcon}>🚪</ThemedText>
          <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => router.push("/(patient)/(tabs)/profile/delete-account" as any)}
        >
          <ThemedText style={styles.deleteIcon}>🗑️</ThemedText>
          <ThemedText style={styles.deleteText}>Delete Account</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.systemBackground,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.label,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.secondaryLabel,
  },
  menuContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    color: colors.label,
  },
  menuArrow: {
    fontSize: 24,
    color: colors.tertiaryLabel,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.systemBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.danger,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.secondaryBackground,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  signOutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.label,
  },
});