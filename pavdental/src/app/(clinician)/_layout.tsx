import { Redirect, Stack } from "expo-router";
import { useCurrentUser } from "@/features/auth/auth-store";
import { getMobilePortalPath, isAllowedInPortal } from "@/features/auth/auth-routing";

export default function ClinicianLayout() {
  const user = useCurrentUser();

  if (!isAllowedInPortal(user?.role, "clinician")) {
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
      <Stack.Screen name="schedule" options={{ title: "Clinician Daily Schedule" }} />
      <Stack.Screen name="consult-room" options={{ headerShown: false }} />
      <Stack.Screen name="rx-dispense" options={{ title: "Electronic Prescription (EPS)" }} />
    </Stack>
  );
}
