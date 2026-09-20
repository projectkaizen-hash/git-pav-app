import { Stack } from "expo-router";

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="service-catalog" options={{ title: "Select Treatment" }} />
      <Stack.Screen name="clinic-picker" options={{ title: "Choose Practice" }} />
      <Stack.Screen name="clinician-picker" options={{ title: "Choose Practitioner" }} />
      <Stack.Screen name="slot-picker" options={{ title: "Available Times" }} />
      <Stack.Screen name="summary" options={{ title: "Review & Deposit" }} />
      <Stack.Screen name="confirmed" options={{ headerShown: false }} />
    </Stack>
  );
}

