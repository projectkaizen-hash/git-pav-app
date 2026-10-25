import { Stack } from "expo-router";
import { stackScreenOptions } from "@/components";

export default function VanLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen name="service-area" options={{ title: "Van Coverage Check" }} />
      <Stack.Screen name="not-covered" options={{ title: "Area Not Covered" }} />
      <Stack.Screen name="access-details" options={{ title: "Van Parking & Access" }} />
      <Stack.Screen name="confirm" options={{ title: "Review & Dispatch Hold" }} />
      <Stack.Screen name="live-track" options={{ title: "Live Van Tracking", headerShown: false }} />
      <Stack.Screen name="complete" options={{ title: "Visit Summary", headerShown: false }} />
    </Stack>
  );
}

