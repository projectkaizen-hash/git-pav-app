import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemedText, AppIcon } from "@/components";
import { ToggleSwitch } from "@/components/settings/ToggleSwitch";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useNotificationPermissions,
} from "@/features/notifications/notification-hooks";
import { colors, spacing, type } from "@/theme";

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

  useEffect(() => {
    if (!prefs) return;
    if (typeof prefs.pushEnabled === "boolean") setPushEnabled(prefs.pushEnabled);
    if (typeof prefs.emailEnabled === "boolean") setEmailEnabled(prefs.emailEnabled);
    if (typeof prefs.smsEnabled === "boolean") setSmsEnabled(prefs.smsEnabled);
    if (typeof prefs.appointmentReminders === "boolean") {
      setAppointmentReminders(prefs.appointmentReminders);
    }
    if (typeof prefs.appointmentConfirmations === "boolean") {
      setAppointmentConfirmations(prefs.appointmentConfirmations);
    }
    if (typeof prefs.marketingUpdates === "boolean") {
      setMarketingUpdates(prefs.marketingUpdates);
    }
  }, [prefs]);

  const handleTogglePush = async (value: boolean) => {
    if (value && !permissions.granted) {
      const granted = await requestPermissions?.();
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

  const handleTogglePushStub = (_value: boolean) => {
    // No-op for disabled toggle
  };

  // Disable push toggle if notifications are not available (Expo Go)
  const isPushAvailable = requestPermissions !== undefined;

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
          description={!isPushAvailable ? "Not available in Expo Go - requires development build" : "Instant alerts for booking changes and arrival updates"}
          value={pushEnabled}
          onValueChange={isPushAvailable ? handleTogglePush : handleTogglePushStub}
          disabled={!isPushAvailable}
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
          icon={<AppIcon name="activity" size={18} color={colors.ink} />}
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
    ...type.overline,
  },
});

