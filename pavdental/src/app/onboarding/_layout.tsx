import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="profile" />
      <Stack.Screen name="address" />
      <Stack.Screen name="medical-history" />
      <Stack.Screen name="consents" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}

