import { Stack } from "expo-router";

export default function AppointmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "Appointment Details" }} />
      <Stack.Screen name="cancelled" options={{ title: "Appointment Cancelled", headerShown: false }} />
    </Stack>
  );
}
