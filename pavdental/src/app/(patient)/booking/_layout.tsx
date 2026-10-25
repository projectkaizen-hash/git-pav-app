import { Stack } from "expo-router";
import { stackScreenOptions } from "@/components";

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen name="service-catalog" options={{ title: "Select Treatment", headerTitle: "" }} />
      <Stack.Screen name="clinic-picker" options={{ title: "Choose Practice", headerShown: false }} />
      <Stack.Screen name="clinician-picker" options={{ title: "Choose Practitioner", headerShown: false }} />
      <Stack.Screen name="provider-profile" options={{ title: "Practitioner Profile" }} />
      <Stack.Screen name="slot-picker" options={{ title: "Available Times", headerShown: false }} />
      <Stack.Screen name="insurance" options={{ title: "Insurance & Eligibility" }} />
      <Stack.Screen name="summary" options={{ title: "Review & Deposit", headerShown: false }} />
      <Stack.Screen name="confirmed" options={{ headerShown: false }} />
    </Stack>
  );
}

