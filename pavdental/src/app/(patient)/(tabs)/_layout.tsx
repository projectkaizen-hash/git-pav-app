import { Tabs } from "expo-router";
import { colors } from "@/theme";
import { ThemedText } from "@/components";

export default function PatientTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.systemBackground,
        },
        headerTitleStyle: {
          color: colors.label,
          fontWeight: "700",
        },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.systemBackground,
          borderTopColor: colors.separator,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.secondaryLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <ThemedText style={{ color }}>🏠</ThemedText>,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appointments",
          tabBarLabel: "Bookings",
          tabBarIcon: ({ color }) => <ThemedText style={{ color }}>📅</ThemedText>,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: "Dental Records",
          tabBarLabel: "Records",
          tabBarIcon: ({ color }) => <ThemedText style={{ color }}>🦷</ThemedText>,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarLabel: "Account",
          tabBarIcon: ({ color }) => <ThemedText style={{ color }}>👤</ThemedText>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile & Settings",
          tabBarLabel: "Profile",
          headerShown: false,
          tabBarIcon: ({ color }) => <ThemedText style={{ color }}>👤</ThemedText>,
        }}
      />
    </Tabs>
  );
}

