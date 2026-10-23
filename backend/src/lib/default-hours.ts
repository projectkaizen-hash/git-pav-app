import type { PrismaClient } from "@prisma/client";

// Default hours (decisions log #12): Mon to Fri 09:00 to 17:30, Sat 09:00 to
// 13:00, Sun closed. Minutes after midnight, UK time; weekday 0 = Sunday.
export const DEFAULT_WEEK = [
  ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: 540, end: 1050 })),
  { weekday: 6, start: 540, end: 780 },
];

/**
 * Gives every clinic without hours the default hours, and every clinician
 * without a rota the same weekly rota (not tied to one clinic). Rows that
 * already exist are left alone, so it is safe to run again.
 */
export async function applyDefaultHours(prisma: PrismaClient) {
  const clinics = await prisma.clinic.findMany({ where: { openingHours: { none: {} } }, select: { id: true } });
  const hours = await prisma.clinicOpeningHours.createMany({
    data: clinics.flatMap((c) =>
      DEFAULT_WEEK.map((d) => ({ clinicId: c.id, weekday: d.weekday, opensMinute: d.start, closesMinute: d.end }))
    ),
    skipDuplicates: true,
  });
  const clinicians = await prisma.clinicianProfile.findMany({ where: { rota: { none: {} } }, select: { id: true } });
  const rota = await prisma.clinicianRotaBlock.createMany({
    data: clinicians.flatMap((c) =>
      DEFAULT_WEEK.map((d) => ({ clinicianId: c.id, weekday: d.weekday, startMinute: d.start, endMinute: d.end }))
    ),
    skipDuplicates: true,
  });
  return { clinics: clinics.length, clinicians: clinicians.length, rows: hours.count + rota.count };
}
