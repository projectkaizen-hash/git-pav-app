import { Stack } from "expo-router";
import { stackScreenOptions } from "@/components";

export default function VanLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen name="service-area" options={{ title: "Van coverage check", headerTitle: "" }} />
      <Stack.Screen name="not-covered" options={{ title: "Area not covered", headerTitle: "" }} />
      <Stack.Screen name="access-details" options={{ title: "Van parking & access", headerTitle: "" }} />
      <Stack.Screen name="confirm" options={{ title: "Review & dispatch hold" }} />
      <Stack.Screen name="live-track" options={{ title: "Live van tracking", headerShown: false }} />
      <Stack.Screen name="complete" options={{ title: "Visit summary", headerShown: false }} />
    </Stack>
  );
}

