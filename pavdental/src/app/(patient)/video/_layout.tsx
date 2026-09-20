import { Stack } from "expo-router";

export default function VideoLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="intake" options={{ title: "Dental Triage" }} />
      <Stack.Screen name="photos" options={{ title: "Intraoral Photos" }} />
      <Stack.Screen name="device-check" options={{ title: "Camera & Mic Check" }} />
      <Stack.Screen name="waiting" options={{ title: "Waiting Room", headerShown: false }} />
      <Stack.Screen name="call" options={{ headerShown: false }} />
      <Stack.Screen name="summary" options={{ title: "Consultation Summary", headerShown: false }} />
    </Stack>
  );
}

