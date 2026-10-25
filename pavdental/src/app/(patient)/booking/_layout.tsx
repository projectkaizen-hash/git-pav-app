import { Stack } from "expo-router";
import { stackScreenOptions } from "@/components";

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen name="service-catalog" options={{ title: "Select Treatment" }} />
      <Stack.Screen name="clinic-picker" options={{ title: "Choose Practice" }} />
      <Stack.Screen name="clinician-picker" options={{ title: "Choose Practitioner" }} />
      <Stack.Screen name="provider-profile" options={{ title: "Practitioner Profile" }} />
      <Stack.Screen name="slot-picker" options={{ title: "Available Times" }} />
      <Stack.Screen name="insurance" options={{ title: "Insurance & Eligibility" }} />
      <Stack.Screen name="summary" options={{ title: "Review & Deposit" }} />
      <Stack.Screen name="confirmed" options={{ headerShown: false }} />
    </Stack>
  );
}

