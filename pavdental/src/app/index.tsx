import { Redirect } from "expo-router";
import { useCurrentUser, useIsAuthenticated } from "@/features/auth/auth-store";
import { getMobilePortalPath } from "@/features/auth/auth-routing";

export default function Index() {
  const isAuthenticated = useIsAuthenticated();
  const user = useCurrentUser();

  if (isAuthenticated && user) {
    return <Redirect href={getMobilePortalPath(user.role) as never} />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
