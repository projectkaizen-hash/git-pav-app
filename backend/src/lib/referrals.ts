import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { createAuditLogWithIntegrity } from "./audit-integrity";
import { pseudonymiseIp } from "./audit-security";

// Refer-a-friend (decisions D-03, owner's rules of 25 Oct 2026): a new patient
// signs up with someone's code. When that patient's first completed visit
// costs over £150, the code's owner gets a £25 voucher, which staff take off
// their next treatment bill at the practice. The friend gets nothing, and the
// referrer never learns who the friend is or what treatment they had.

export const REFERRAL_VOUCHER_PENCE = 2500;
/** The visit must cost more than this. */
export const REFERRAL_MIN_VISIT_PENCE = 15000;

// No 0/O or 1/I, so codes survive being read out loud.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function normaliseReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/[\s-]/g, "");
}

/** Staff may type a voucher with or without the "REF-" prefix or spaces. */
export function normaliseVoucherCode(code: string): string {
  const c = normaliseReferralCode(code);
  return `REF-${c.startsWith("REF") ? c.slice(3) : c}`;
}

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

/** The patient's own code, made the first time they ask for it. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referralCode.findUnique({ where: { userId }, select: { code: true } });
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await prisma.referralCode.create({ data: { userId, code: randomCode(8) } });
      return created.code;
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      // Either the code was taken or a parallel request made this user's code.
      const raced = await prisma.referralCode.findUnique({ where: { userId }, select: { code: true } });
      if (raced) return raced.code;
    }
  }
  throw new Error("Could not create a referral code");
}

/** The user who owns a code, or null if there's no such code. */
export async function findReferrer(code: string): Promise<string | null> {
  const row = await prisma.referralCode.findUnique({
    where: { code: normaliseReferralCode(code) },
    select: { userId: true, user: { select: { isActive: true, erasedAt: true } } },
  });
  if (!row || !row.user.isActive || row.user.erasedAt) return null;
  return row.userId;
}

export type ReferralVoucherOutcome = "issued" | "not_referred" | "not_qualifying" | "already_issued";

/**
 * Issues the referrer's voucher if this completed appointment is the referred
 * patient's first one over £150. Safe to call more than once for the same
 * visit, and from the catch-up sweep.
 */
export async function issueReferralVoucher(appointmentId: string): Promise<ReferralVoucherOutcome> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { status: true, totalPricePence: true, patient: { select: { userId: true } } },
  });
  if (!appointment || appointment.status !== "completed") return "not_qualifying";
  if (appointment.totalPricePence <= REFERRAL_MIN_VISIT_PENCE) return "not_qualifying";

  const referral = await prisma.referral.findUnique({
    where: { referredUserId: appointment.patient.userId },
    select: { id: true, referrerUserId: true, qualifyingAppointmentId: true },
  });
  if (!referral) return "not_referred";
  if (referral.qualifyingAppointmentId) return "already_issued";

  const voucherCode = `REF-${randomCode(6)}`;
  // Conditional update: a repeat or a parallel call finds it already set.
  const { count } = await prisma.referral.updateMany({
    where: { id: referral.id, qualifyingAppointmentId: null },
    data: {
      qualifyingAppointmentId: appointmentId,
      voucherCode,
      voucherPence: REFERRAL_VOUCHER_PENCE,
      voucherIssuedAt: new Date(),
    },
  });
  if (count === 0) return "already_issued";

  await createAuditLogWithIntegrity({
    action: "referrals.voucher_issued",
    actorId: null,
    resourceId: referral.id,
    sessionId: null,
    ipHash: pseudonymiseIp(""),
    metadata: { voucherPence: REFERRAL_VOUCHER_PENCE },
  });
  return "issued";
}

/** What the referrer may see: counts and their own vouchers, nothing about the friends. */
export async function referralSummary(userId: string) {
  const [code, referrals] = await Promise.all([
    getOrCreateReferralCode(userId),
    prisma.referral.findMany({
      where: { referrerUserId: userId },
      select: { voucherCode: true, voucherPence: true, voucherIssuedAt: true, voucherUsedAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return {
    code,
    voucherPence: REFERRAL_VOUCHER_PENCE,
    minVisitPence: REFERRAL_MIN_VISIT_PENCE,
    friendsJoined: referrals.length,
    vouchers: referrals
      .filter((r) => r.voucherCode)
      .map((r) => ({
        voucherCode: r.voucherCode as string,
        amountPence: r.voucherPence ?? REFERRAL_VOUCHER_PENCE,
        issuedAt: r.voucherIssuedAt,
        usedAt: r.voucherUsedAt,
      })),
  };
}

/**
 * Catches up referrals whose friend already had a qualifying visit but whose
 * voucher wasn't issued at completion time (for example a database error).
 */
export async function issueMissedReferralVouchers(limit = 50): Promise<number> {
  const qualifyingVisit = { status: "completed" as const, totalPricePence: { gt: REFERRAL_MIN_VISIT_PENCE } };
  const pending = await prisma.referral.findMany({
    where: { qualifyingAppointmentId: null, referred: { patientProfile: { appointments: { some: qualifyingVisit } } } },
    select: { referred: { select: { patientProfile: { select: { appointments: {
      where: qualifyingVisit,
      orderBy: { startTimeUtc: "asc" },
      take: 1,
      select: { id: true },
    } } } } } },
    take: limit,
  });
  let issued = 0;
  for (const row of pending) {
    const first = row.referred.patientProfile?.appointments[0];
    if (first && (await issueReferralVoucher(first.id)) === "issued") issued += 1;
  }
  return issued;
}
