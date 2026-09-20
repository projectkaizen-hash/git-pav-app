import { Stack } from "expo-router";

export default function RecordsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="odontogram" options={{ title: "Dental Odontogram" }} />
      <Stack.Screen name="plans" options={{ title: "Treatment Plans" }} />
      <Stack.Screen name="vault" options={{ title: "Document Vault" }} />
    </Stack>
  );
}

