import { Stack } from "expo-router";
import { stackScreenOptions } from "@/components";

export default function AppointmentsLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen name="[id]" options={{ title: "Appointment Details", headerShown: false }} />
      <Stack.Screen name="cancelled" options={{ title: "Appointment Cancelled", headerShown: false }} />
    </Stack>
  );
}
