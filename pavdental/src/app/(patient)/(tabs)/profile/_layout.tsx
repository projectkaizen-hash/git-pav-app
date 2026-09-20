import { Stack } from "expo-router";
import { colors } from "@/theme";

export default function ProfileSubLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.systemBackground,
        },
        headerTitleStyle: {
          color: colors.label,
          fontWeight: "600",
        },
        headerTintColor: colors.brand,
        headerShadowVisible: false,
        headerBackTitle: "Account",
      }}
    >
      <Stack.Screen
        name="personal-info"
        options={{
          title: "Personal Information",
        }}
      />
      <Stack.Screen
        name="medical-history"
        options={{
          title: "Medical History",
        }}
      />
      <Stack.Screen
        name="emergency-contact"
        options={{
          title: "Emergency Contact",
        }}
      />
      <Stack.Screen
        name="security"
        options={{
          title: "Security & Privacy",
        }}
      />
      <Stack.Screen
        name="sessions"
        options={{
          title: "Active Sessions",
        }}
      />
      <Stack.Screen
        name="consent"
        options={{
          title: "Consent & GDPR",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: "Notification Preferences",
        }}
      />
      <Stack.Screen
        name="payment-methods"
        options={{
          title: "Payment Methods",
        }}
      />
      <Stack.Screen
        name="dependants"
        options={{
          title: "Dependants & Family",
        }}
      />
      <Stack.Screen
        name="delete-account"
        options={{
          title: "Delete Account",
          headerTintColor: colors.danger,
        }}
      />
    </Stack>
  );
}

