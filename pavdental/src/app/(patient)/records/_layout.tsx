import { Stack } from "expo-router";
import { stackScreenOptions } from "@/components";

export default function RecordsLayout() {
  return (
    <Stack
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen name="odontogram" options={{ title: "Dental Odontogram" }} />
      <Stack.Screen name="plans" options={{ title: "Treatment Plans" }} />
      <Stack.Screen name="plans/[id]" options={{ title: "Plan Details" }} />
      <Stack.Screen name="prescriptions" options={{ title: "Prescriptions & Meds" }} />
      <Stack.Screen name="prescriptions/[id]" options={{ title: "Prescription Details" }} />
      <Stack.Screen name="vault" options={{ title: "Document Vault" }} />
      <Stack.Screen name="financing" options={{ title: "Payment plans" }} />
      <Stack.Screen name="insights" options={{ title: "Oral Health Insights" }} />
    </Stack>
  );
}

