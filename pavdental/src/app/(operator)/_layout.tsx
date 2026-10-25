import { Redirect, Stack } from "expo-router";
import { useCurrentUser } from "@/features/auth/auth-store";
import { getMobilePortalPath, isAllowedInPortal } from "@/features/auth/auth-routing";
import { stackScreenOptions } from "@/components";

export default function OperatorLayout() {
  const user = useCurrentUser();

  if (!isAllowedInPortal(user?.role, "operator")) {
    return <Redirect href={user ? (getMobilePortalPath(user.role) as never) : "/(auth)/welcome"} />;
  }

  return (
    <Stack
      screenOptions={stackScreenOptions}
    >
      <Stack.Screen name="shift" options={{ title: "Van dispatch console", headerTitle: "" }} />
      <Stack.Screen name="incoming" options={{ title: "Incoming requests", headerTitle: "" }} />
      <Stack.Screen name="route" options={{ title: "Live van queue", headerTitle: "" }} />
      <Stack.Screen name="van-check-in" options={{ title: "Patient arrival check-in", headerTitle: "" }} />
      <Stack.Screen name="offline-capture" options={{ title: "Clinical note & complete stop", headerTitle: "" }} />
    </Stack>
  );
}
