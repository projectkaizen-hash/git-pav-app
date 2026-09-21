import { Redirect, Stack } from "expo-router";
import { useCurrentUser } from "@/features/auth/auth-store";
import { getMobilePortalPath, isAllowedInPortal } from "@/features/auth/auth-routing";

export default function OperatorLayout() {
  const user = useCurrentUser();

  if (!isAllowedInPortal(user?.role, "operator")) {
    return <Redirect href={user ? (getMobilePortalPath(user.role) as never) : "/(auth)/welcome"} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="shift" options={{ title: "Van Dispatch Console" }} />
      <Stack.Screen name="incoming" options={{ title: "Incoming Requests" }} />
      <Stack.Screen name="route" options={{ title: "Live Van Queue" }} />
      <Stack.Screen name="check-in" options={{ title: "Patient Arrival Check-In" }} />
      <Stack.Screen name="offline-capture" options={{ title: "Clinical Note & Complete Stop" }} />
    </Stack>
  );
}
