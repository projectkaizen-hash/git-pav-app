import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components";
import { ToggleSwitch } from "@/components/settings/ToggleSwitch";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useNotificationPermissions,
} from "@/features/notifications/notification-hooks";
import { colors, spacing } from "@/theme";

export default function NotificationsScreen() {
  const { data: prefs } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();
  const { requestPermissions, permissions } = useNotificationPermissions();

  // Local state initialized with prefs
  const [pushEnabled, setPushEnabled] = useState(prefs?.pushEnabled ?? true);
  const [emailEnabled, setEmailEnabled] = useState(prefs?.emailEnabled ?? true);
  const [smsEnabled, setSmsEnabled] = useState(prefs?.smsEnabled ?? true);
  const [appointmentReminders, setAppointmentReminders] = useState(prefs?.appointmentReminders ?? true);
  const [appointmentConfirmations, setAppointmentConfirmations] = useState(prefs?.appointmentConfirmations ?? true);
  const [marketingUpdates, setMarketingUpdates] = useState(prefs?.marketingUpdates ?? false);

  const handleTogglePush = async (value: boolean) => {
    if (value && !permissions.granted) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please enable notification permissions for Pav Dental in your device settings."
        );
        return;
      }
    }
    setPushEnabled(value);
    savePreference({ pushEnabled: value });
  };

  const savePreference = (updated: Record<string, boolean>) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // optional
    }
    updatePrefs.mutate({
      pushEnabled,
      emailEnabled,
      smsEnabled,
      appointmentReminders,
      appointmentConfirmations,
      marketingUpdates,
      ...updated,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Channels */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          DELIVERY CHANNELS
        </ThemedText>

        <ToggleSwitch
          label="Push Notifications"
          description="Instant alerts for booking changes and arrival updates"
          value={pushEnabled}
          onValueChange={handleTogglePush}
          icon={<ThemedText>📲</ThemedText>}
        />

        <ToggleSwitch
          label="Email Notifications"
          description="Treatment plans, prescriptions, receipts and invoices"
          value={emailEnabled}
          onValueChange={(val) => {
            setEmailEnabled(val);
            savePreference({ emailEnabled: val });
          }}
          icon={<ThemedText>✉️</ThemedText>}
        />

        <ToggleSwitch
          label="SMS Text Messages"
          description="Emergency reminders and two-factor security codes"
          value={smsEnabled}
          onValueChange={(val) => {
            setSmsEnabled(val);
            savePreference({ smsEnabled: val });
          }}
          icon={<ThemedText>💬</ThemedText>}
        />
      </View>

      {/* Appointment & Clinical Alerts */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          APPOINTMENTS & CLINICAL
        </ThemedText>

        <ToggleSwitch
          label="Appointment Reminders"
          description="Receive notifications 24 hours and 2 hours before your slot"
          value={appointmentReminders}
          onValueChange={(val) => {
            setAppointmentReminders(val);
            savePreference({ appointmentReminders: val });
          }}
          icon={<ThemedText>⏰</ThemedText>}
        />

        <ToggleSwitch
          label="Appointment Confirmations"
          description="Immediate confirmations when new bookings or deposits succeed"
          value={appointmentConfirmations}
          onValueChange={(val) => {
            setAppointmentConfirmations(val);
            savePreference({ appointmentConfirmations: val });
          }}
          icon={<ThemedText>🦷</ThemedText>}
        />
      </View>

      {/* Preferences & Marketing */}
      <View style={styles.section}>
        <ThemedText variant="subhead" style={styles.sectionTitle}>
          MARKETING & UPDATES
        </ThemedText>

        <ToggleSwitch
          label="Oral Health Tips & Promotions"
          description="Occasional updates on dental hygiene products & whitening"
          value={marketingUpdates}
          onValueChange={(val) => {
            setMarketingUpdates(val);
            savePreference({ marketingUpdates: val });
          }}
          icon={<ThemedText>✨</ThemedText>}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.systemBackground,
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
});

