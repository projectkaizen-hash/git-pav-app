// Shapes and form checks for the dentist profiles screen. The backend checks
// everything again; these only give staff a clear message before saving.

export interface DentistProfile {
  id: string;
  fullName: string;
  roleTitle: string | null;
  gdcNumber: string;
  specialisms: string[];
  bio: string | null;
  photoUrl: string | null;
  showOnWebsite: boolean;
  websiteOrder: number;
}

export interface DentistForm {
  fullName: string;
  roleTitle: string;
  gdcNumber: string;
  specialisms: string;
  bio: string;
  photoUrl: string;
  showOnWebsite: boolean;
}

type Result<T> = { ok: true; payload: T } | { ok: false; error: string };

/** Uploaded photos are kept small: they're sent with every team page view. */
export const MAX_PHOTO_BYTES = 1024 * 1024;

export function toForm(d: DentistProfile): DentistForm {
  return {
    fullName: d.fullName,
    roleTitle: d.roleTitle ?? "",
    gdcNumber: d.gdcNumber,
    specialisms: d.specialisms.join(", "),
    bio: d.bio ?? "",
    photoUrl: d.photoUrl ?? "",
    showOnWebsite: d.showOnWebsite,
  };
}

export function profilePayload(form: DentistForm): Result<{
  fullName: string;
  roleTitle: string;
  gdcNumber: string;
  specialisms: string[];
  bio: string | null;
  photoUrl: string | null;
  showOnWebsite: boolean;
}> {
  const fullName = form.fullName.trim();
  const roleTitle = form.roleTitle.trim();
  const gdcNumber = form.gdcNumber.trim();
  const bio = form.bio.trim();
  const photoUrl = form.photoUrl.trim();
  const specialisms = form.specialisms
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (fullName.length < 2) return { ok: false, error: "Enter the dentist's name" };
  if (roleTitle.length < 2) return { ok: false, error: 'Enter a role, for example "Dentist"' };
  if (!/^\d{6}$/.test(gdcNumber)) return { ok: false, error: "GDC number must be exactly 6 digits" };
  if (specialisms.length > 12) return { ok: false, error: "Keep it to 12 specialisms or fewer" };
  if (bio.length > 1500) return { ok: false, error: "Keep the bio under 1,500 characters" };
  if (photoUrl && !photoUrl.startsWith("https://") && !photoUrl.startsWith("data:image/")) {
    return { ok: false, error: "Photo link must start with https://" };
  }
  if (form.showOnWebsite && !bio) return { ok: false, error: "Add a bio before showing them on the website" };

  return {
    ok: true,
    payload: {
      fullName,
      roleTitle,
      gdcNumber,
      specialisms,
      bio: bio || null,
      photoUrl: photoUrl || null,
      showOnWebsite: form.showOnWebsite,
    },
  };
}

/** Website order: shown dentists first, in their order, then the rest by name. */
export function sortForWebsite(list: DentistProfile[]): DentistProfile[] {
  return [...list].sort(
    (a, b) =>
      Number(b.showOnWebsite) - Number(a.showOnWebsite) ||
      a.websiteOrder - b.websiteOrder ||
      a.fullName.localeCompare(b.fullName),
  );
}

/** The ids with the one at `index` moved up (-1) or down (+1); null at either end. */
export function moveId(ids: string[], index: number, by: -1 | 1): string[] | null {
  const to = index + by;
  if (index < 0 || index >= ids.length || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[index], next[to]] = [next[to], next[index]];
  return next;
}
