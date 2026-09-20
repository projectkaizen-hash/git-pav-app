import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useAccessToken } from "../auth/auth-store";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  appointmentReminders: boolean;
  appointmentConfirmations: boolean;
  marketingUpdates: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface ScheduledNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  data: any;
  scheduledFor: Date;
  status: "pending" | "sent" | "cancelled";
}

interface NotificationHistory {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: any;
  sentAt: Date;
  status: string;
}

// Configure notification permissions
export function useNotificationPermissions() {
  const [permissions, setPermissions] = React.useState<{
    granted: boolean | null;
    canAskAgain: boolean;
  }>({
    granted: null,
    canAskAgain: true,
  });

  const requestPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissions({
        granted: finalStatus === "granted",
        canAskAgain: existingStatus !== "granted",
      });

      return finalStatus === "granted";
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      setPermissions({ granted: false, canAskAgain: false });
      return false;
    }
  };

  const checkPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissions({
        granted: status === "granted",
        canAskAgain: status !== "granted",
      });
      return status === "granted";
    } catch (error) {
      console.error("Error checking notification permissions:", error);
      return false;
    }
  };

  return {
    permissions,
    requestPermissions,
    checkPermissions,
  };
}

// Register push token
export function useRegisterPushToken() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expoPushToken: string) => {
      const platform = Platform.OS;

      const response = await fetch(`${API_BASE}/api/notifications/register-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ expoPushToken, platform }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to register push token");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}

// Get notification preferences
export function useNotificationPreferences() {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/notifications/preferences`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notification preferences");
      }

      return response.json() as Promise<NotificationPreferences>;
    },
  });
}

// Update notification preferences
export function useUpdateNotificationPreferences() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      const response = await fetch(`${API_BASE}/api/notifications/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update notification preferences");
      }

      return response.json() as Promise<NotificationPreferences>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}

// Schedule notification
export function useScheduleNotification() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, body, data, scheduledFor }: {
      title: string;
      body: string;
      data?: any;
      scheduledFor: Date;
    }) => {
      const response = await fetch(`${API_BASE}/api/notifications/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title,
          body,
          data,
          scheduledFor: scheduledFor.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to schedule notification");
      }

      return response.json() as Promise<ScheduledNotification>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-history"] });
    },
  });
}

// Get notification history
export function useNotificationHistory(limit: number = 20, offset: number = 0) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: ["notification-history", limit, offset],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE}/api/notifications/history?limit=${limit}&offset=${offset}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notification history");
      }

      return response.json() as Promise<NotificationHistory[]>;
    },
  });
}

// Send payment receipt
export function useSendReceipt() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, amountPence, paymentMethod }: {
      appointmentId: string;
      amountPence: number;
      paymentMethod: string;
    }) => {
      const response = await fetch(`${API_BASE}/api/notifications/send-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          appointmentId,
          amountPence,
          paymentMethod,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send receipt");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-history"] });
    },
  });
}

// Combined notification management hook
export function useNotificationManager() {
  const permissions = useNotificationPermissions();
  const registerToken = useRegisterPushToken();
  const preferences = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const scheduleNotification = useScheduleNotification();
  const history = useNotificationHistory();
  const sendReceipt = useSendReceipt();

  const setupNotifications = async () => {
    // Request permissions
    const granted = await permissions.requestPermissions();
    if (!granted) {
      console.warn("Notification permissions not granted");
      return false;
    }

    // Get push token
    const token = await Notifications.getExpoPushTokenAsync();
    if (token) {
      await registerToken.mutateAsync(token.data);
    }

    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    return true;
  };

  const sendAppointmentReminder = async (appointmentId: string, appointmentTime: Date) => {
    // Schedule reminder 24 hours before appointment
    const reminderTime = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);
    
    return scheduleNotification.mutateAsync({
      title: "Appointment Reminder",
      body: "You have a dental appointment tomorrow",
      data: { appointmentId, type: "appointment_reminder" },
      scheduledFor: reminderTime,
    });
  };

  const sendAppointmentConfirmation = async (appointmentId: string, appointmentTime: Date) => {
    return scheduleNotification.mutateAsync({
      title: "Appointment Confirmed",
      body: `Your appointment is confirmed for ${appointmentTime.toLocaleString()}`,
      data: { appointmentId, type: "appointment_confirmation" },
      scheduledFor: new Date(), // Send immediately
    });
  };

  return {
    permissions,
    registerToken,
    preferences,
    updatePreferences,
    scheduleNotification,
    history,
    sendReceipt,
    setupNotifications,
    sendAppointmentReminder,
    sendAppointmentConfirmation,
  };
}
