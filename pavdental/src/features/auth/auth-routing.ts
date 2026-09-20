import type { UserRole } from "./auth-store";

export type MobilePortalRole = Exclude<UserRole, "admin">;

export const mobilePortalPathByRole: Record<MobilePortalRole, string> = {
  patient: "/(patient)/(tabs)/home",
  clinician: "/(clinician)/schedule",
  operator: "/(operator)/route",
};

export function getMobilePortalPath(role: UserRole): string {
  return mobilePortalPathByRole[role as MobilePortalRole] ?? "/(auth)/access-denied";
}

export function isAllowedInPortal(role: UserRole | undefined, portal: MobilePortalRole): boolean {
  return role === portal;
}
