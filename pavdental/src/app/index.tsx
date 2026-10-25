import { Redirect } from "expo-router";
import { useCurrentUser, useIsAuthenticated, useAuthStore } from "@/features/auth/auth-store";
import { useAppLockStore } from "@/features/app-lock/app-lock-store";
import { getMobilePortalPath } from "@/features/auth/auth-routing";

export default function Index() {
  const isAuthenticated = useIsAuthenticated();
  const user = useCurrentUser();
  const isLocked = useAppLockStore((s) => s.isLocked);
  const requiresBiometric = useAppLockStore((s) => s.requiresBiometric);
  const biometricUnlocked = useAuthStore((s) => s.biometricUnlocked);

  if (isAuthenticated && user) {
    // MA-3: If biometric lock is enabled and locked or unvalidated, route to unlock gate
    if (requiresBiometric && (isLocked || !biometricUnlocked)) {
      return <Redirect href="/(auth)/biometric-unlock" />;
    }
    return <Redirect href={getMobilePortalPath(user.role) as never} />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
