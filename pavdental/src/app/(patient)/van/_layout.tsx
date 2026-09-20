import { Stack } from "expo-router";

export default function VanLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="service-area" options={{ title: "Van Coverage Check" }} />
      <Stack.Screen name="access-details" options={{ title: "Van Parking & Access" }} />
      <Stack.Screen name="slots" options={{ title: "Select Van Arrival Time" }} />
      <Stack.Screen name="confirm" options={{ title: "Review & Dispatch Hold" }} />
      <Stack.Screen name="live-track" options={{ title: "Live Van Tracking", headerShown: false }} />
      <Stack.Screen name="complete" options={{ title: "Visit Summary", headerShown: false }} />
    </Stack>
  );
}

