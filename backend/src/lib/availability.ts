import { prisma } from "./prisma";

// Bookable times come from clinic opening hours and each clinician's rota
// (decisions log #12), in UK time. Hours are stored as minutes after midnight,
// Europe/London, so 09:00 stays 09:00 across the clocks changing.

export const PRACTICE_TIME_ZONE = "Europe/London";
/** Nobody can book a slot that starts sooner than this. */
export const BOOKING_LEAD_MINUTES = 60;

const londonParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: PRACTICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsOf(instant: Date) {
  const parts = Object.fromEntries(londonParts.formatToParts(instant).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    seconds: Number(parts.second),
  };
}

/** The UK calendar date (YYYY-MM-DD) an instant falls on. */
export function londonDate(instant: Date): string {
  return partsOf(instant).date;
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD calendar date. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Midnight UTC of a calendar date, the form Prisma uses for @db.Date. */
export function dateOnly(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** The instant a UK wall-clock time on a given date happens. */
export function londonTimeToUtc(date: string, minuteOfDay: number): Date {
  if (minuteOfDay >= 1440) {
    const next = new Date(dateOnly(date).getTime() + 86400000).toISOString().slice(0, 10);
    return londonTimeToUtc(next, minuteOfDay - 1440);
  }
  const naive = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    0,
    minuteOfDay
  );
  // The UK is UTC or UTC+1. Try both and keep the one that reads back as the
  // asked-for wall time; in the hour skipped in spring neither does, and the
  // later one is used.
  for (const offsetMinutes of [60, 0]) {
    const candidate = new Date(naive - offsetMinutes * 60000);
    const back = partsOf(candidate);
    if (back.date === date && back.minutes === minuteOfDay) return candidate;
  }
  return new Date(naive);
}

/** Start of the UK day an instant falls on. */
export function startOfLondonDay(instant: Date): Date {
  return londonTimeToUtc(londonDate(instant), 0);
}

type Window = { start: number; end: number; clinicId: string | null };

export type SlotChannel = "clinic" | "video" | "van";

export type Slot = {
  clinicianId: string;
  startTimeUtc: Date;
  endTimeUtc: Date;
  available: boolean;
};

export class AvailabilityError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * When each matching clinician works on a UK calendar date, as minutes after
 * midnight. For a clinic visit the times are also cut to the clinic's hours,
 * and a closed clinic gives nobody any time.
 */
export async function workingWindows(args: {
  date: string;
  channel: SlotChannel;
  clinicianId?: string;
  clinicId?: string;
}): Promise<Map<string, Window[]>> {
  const { date, channel, clinicianId, clinicId } = args;
  const weekday = weekdayOf(date);
  const windowsByClinician = new Map<string, Window[]>();

  let clinicHours: { opens: number; closes: number } | null = null;
  if (channel === "clinic") {
    if (!clinicId) throw new AvailabilityError(400, "Choose a clinic to see its times");
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        isActive: true,
        openingHours: { where: { weekday } },
        closures: { where: { date: dateOnly(date) }, select: { id: true } },
      },
    });
    if (!clinic || !clinic.isActive) throw new AvailabilityError(404, "Clinic not found");
    const hours = clinic.openingHours[0];
    if (!hours || clinic.closures.length > 0) return windowsByClinician;
    clinicHours = { opens: hours.opensMinute, closes: hours.closesMinute };
  }

  const clinicians = await prisma.clinicianProfile.findMany({
    where: {
      ...(clinicianId ? { id: clinicianId } : {}),
      ...(channel === "video" ? { isTelehealthActive: true } : {}),
    },
    select: {
      id: true,
      rota: { where: { weekday }, select: { startMinute: true, endMinute: true, clinicId: true } },
      rotaOverrides: {
        where: { date: dateOnly(date) },
        select: { startMinute: true, endMinute: true, clinicId: true },
      },
    },
    orderBy: { id: "asc" },
  });

  for (const c of clinicians) {
    const override = c.rotaOverrides[0];
    let windows: Window[] = override
      ? override.startMinute !== null && override.endMinute !== null
        ? [{ start: override.startMinute, end: override.endMinute, clinicId: override.clinicId }]
        : []
      : c.rota.map((b) => ({ start: b.startMinute, end: b.endMinute, clinicId: b.clinicId }));
    if (clinicHours) {
      const { opens, closes } = clinicHours;
      windows = windows
        .filter((w) => w.clinicId === null || w.clinicId === clinicId)
        .map((w) => ({ ...w, start: Math.max(w.start, opens), end: Math.min(w.end, closes) }))
        .filter((w) => w.start < w.end);
    }
    if (windows.length > 0) windowsByClinician.set(c.id, windows);
  }
  return windowsByClinician;
}

/**
 * Every slot each matching clinician works on a UK calendar date, marked
 * available when it is far enough ahead and nothing else overlaps it.
 * Clinic slots also have to fall inside that clinic's opening hours.
 */
export async function slotsForDay(args: {
  date: string;
  channel: SlotChannel;
  durationMinutes: number;
  clinicianId?: string;
  clinicId?: string;
  now?: Date;
}): Promise<Slot[]> {
  const { date, durationMinutes } = args;
  const now = args.now ?? new Date();
  const windowsByClinician = await workingWindows(args);
  if (windowsByClinician.size === 0) return [];

  const dayStart = londonTimeToUtc(date, 0);
  const dayEnd = londonTimeToUtc(date, 1440);
  const busy = await prisma.appointment.findMany({
    where: {
      clinicianId: { in: [...windowsByClinician.keys()] },
      startTimeUtc: { lt: dayEnd },
      endTimeUtc: { gt: dayStart },
      OR: [
        { status: { in: ["confirmed", "in_progress"] } },
        { status: "draft_hold", holdExpiresAt: { gt: now } },
      ],
    },
    select: { clinicianId: true, startTimeUtc: true, endTimeUtc: true },
  });

  const earliest = now.getTime() + BOOKING_LEAD_MINUTES * 60000;
  const slots: Slot[] = [];
  for (const [id, windows] of windowsByClinician) {
    for (const w of windows) {
      for (let m = w.start; m + durationMinutes <= w.end; m += durationMinutes) {
        const startTimeUtc = londonTimeToUtc(date, m);
        const endTimeUtc = londonTimeToUtc(date, m + durationMinutes);
        const taken = busy.some((a) => a.clinicianId === id && a.startTimeUtc < endTimeUtc && a.endTimeUtc > startTimeUtc);
        slots.push({ clinicianId: id, startTimeUtc, endTimeUtc, available: !taken && startTimeUtc.getTime() >= earliest });
      }
    }
  }
  return slots.sort((a, b) => a.startTimeUtc.getTime() - b.startTimeUtc.getTime() || a.clinicianId.localeCompare(b.clinicianId));
}

/**
 * The clinician who will see a booking at this exact time, or null when it
 * isn't a free slot. With no clinician asked for, the first free one.
 */
export async function bookableClinician(args: {
  channel: SlotChannel;
  durationMinutes: number;
  startTimeUtc: Date;
  clinicianId?: string;
  clinicId?: string;
}): Promise<string | null> {
  const slots = await slotsForDay({ ...args, date: londonDate(args.startTimeUtc) });
  const match = slots.find((s) => s.available && s.startTimeUtc.getTime() === args.startTimeUtc.getTime());
  return match?.clinicianId ?? null;
}

/**
 * Upcoming confirmed visits that no longer sit inside their clinician's
 * working hours (and the clinic's, for a clinic visit), e.g. after a rota
 * change or a closure. They stay booked; staff decide what to do with them.
 */
export async function appointmentsOutsideHours(where: { clinicianId?: string; clinicId?: string }, now = new Date()) {
  const upcoming = await prisma.appointment.findMany({
    where: {
      ...where,
      clinicianId: where.clinicianId ?? { not: null },
      channel: { in: ["clinic", "video"] },
      status: "confirmed",
      startTimeUtc: { gte: now },
    },
    select: { id: true, clinicianId: true, clinicId: true, channel: true, startTimeUtc: true, endTimeUtc: true },
    orderBy: { startTimeUtc: "asc" },
    take: 200,
  });
  const outside: typeof upcoming = [];
  for (const a of upcoming) {
    const date = londonDate(a.startTimeUtc);
    let windows: Window[] = [];
    try {
      windows =
        (await workingWindows({
          date,
          channel: a.channel as SlotChannel,
          clinicianId: a.clinicianId!,
          clinicId: a.clinicId ?? undefined,
        })).get(a.clinicianId!) ?? [];
    } catch (err) {
      if (!(err instanceof AvailabilityError)) throw err;
    }
    const fits = windows.some(
      (w) => londonTimeToUtc(date, w.start) <= a.startTimeUtc && a.endTimeUtc <= londonTimeToUtc(date, w.end)
    );
    if (!fits) outside.push(a);
  }
  return outside;
}
