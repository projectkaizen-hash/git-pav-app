import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole, AuthRequest } from "../middleware/auth";
import { validateParams } from "../middleware/validate";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";
import { normaliseVoucherCode, referralSummary } from "../lib/referrals";

// Refer-a-friend (D-03). Patients see their own code and vouchers; staff look
// a voucher up and mark it used when they take £25 off the bill.

export const patientReferralRoutes = Router();

// ─── GET /api/referrals ───────────────────────────────────────────────────────
patientReferralRoutes.get("/", requireRole("patient"), async (req: AuthRequest, res: Response) => {
  return res.json(await referralSummary(req.user!.sub));
});

export const adminReferralRoutes = Router();

const voucherParamsSchema = z.object({ code: z.string().trim().min(4).max(20) }).strict();

async function findVoucher(code: string) {
  return prisma.referral.findUnique({
    where: { voucherCode: normaliseVoucherCode(code) },
    select: {
      id: true,
      voucherCode: true,
      voucherPence: true,
      voucherIssuedAt: true,
      voucherUsedAt: true,
      referrer: {
        select: { email: true, patientProfile: { select: { firstName: true, lastName: true } } },
      },
    },
  });
}

function toStaffView(v: NonNullable<Awaited<ReturnType<typeof findVoucher>>>) {
  const profile = v.referrer.patientProfile;
  return {
    voucherCode: v.voucherCode,
    amountPence: v.voucherPence,
    issuedAt: v.voucherIssuedAt,
    usedAt: v.voucherUsedAt,
    // Staff check the voucher belongs to the patient in front of them.
    patientName: profile ? `${profile.firstName} ${profile.lastName}` : null,
    patientEmail: v.referrer.email,
  };
}

// ─── GET /api/admin/referral-vouchers/:code ──────────────────────────────────
adminReferralRoutes.get(
  "/referral-vouchers/:code",
  requireRole("admin"),
  validateParams(voucherParamsSchema),
  async (req: AuthRequest, res: Response) => {
    const voucher = await findVoucher(String(req.params.code));
    if (!voucher) return res.status(404).json({ error: "No referral voucher with that code" });
    return res.json(toStaffView(voucher));
  }
);

// ─── POST /api/admin/referral-vouchers/:code/use ─────────────────────────────
adminReferralRoutes.post(
  "/referral-vouchers/:code/use",
  requireRole("admin"),
  validateParams(voucherParamsSchema),
  async (req: AuthRequest, res: Response) => {
    const voucher = await findVoucher(String(req.params.code));
    if (!voucher) return res.status(404).json({ error: "No referral voucher with that code" });
    // Conditional update, so a voucher can only be used once.
    const { count } = await prisma.referral.updateMany({
      where: { id: voucher.id, voucherUsedAt: null },
      data: { voucherUsedAt: new Date(), voucherUsedById: req.user!.sub },
    });
    if (count === 0) return res.status(409).json({ error: "This voucher has already been used" });

    await createAuditLogWithIntegrity({
      action: "referrals.voucher_used",
      actorId: req.user!.sub,
      resourceId: voucher.id,
      metadata: { amountPence: voucher.voucherPence },
    });
    const updated = await findVoucher(voucher.voucherCode!);
    return res.json(toStaffView(updated!));
  }
);
