import { prisma } from "./prisma";

// The clinician details that are safe to show the public: the app's
// clinician picker and the website's team page read the same fields.
export const publicProfileSelect = {
  id: true,
  fullName: true,
  gdcNumber: true,
  roleTitle: true,
  specialisms: true,
  bio: true,
  photoUrl: true,
  showOnWebsite: true,
  websiteOrder: true,
} as const;

/** The website's team page, in the order staff set. */
export function websiteDentists() {
  return prisma.clinicianProfile.findMany({
    where: { showOnWebsite: true, user: { isActive: true, erasedAt: null } },
    select: { id: true, fullName: true, gdcNumber: true, roleTitle: true, specialisms: true, bio: true, photoUrl: true },
    orderBy: [{ websiteOrder: "asc" }, { fullName: "asc" }],
  });
}
