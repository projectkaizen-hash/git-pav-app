// Unit tests for the van deposit release decision matrix.
// Stripe is injected via opts.stripe and prisma is mocked, so these run
// hermetically — no database or network required.

import { releaseVanDeposit, isDepositAuthorized, vanCancellationKeepsDeposit } from "../lib/van-payments";

jest.mock("../lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

import { prisma } from "../lib/prisma";

function makeFakeStripe(overrides: {
  retrieveStatus?: string;
  retrieveError?: Error;
  cancelError?: Error;
  refundError?: Error;
} = {}) {
  return {
    paymentIntents: {
      retrieve: overrides.retrieveError
        ? jest.fn().mockRejectedValue(overrides.retrieveError)
        : jest.fn().mockResolvedValue({ id: "pi_test_1", status: overrides.retrieveStatus }),
      cancel: overrides.cancelError
        ? jest.fn().mockRejectedValue(overrides.cancelError)
        : jest.fn().mockResolvedValue({ id: "pi_test_1", status: "canceled" }),
    },
    refunds: {
      create: overrides.refundError
        ? jest.fn().mockRejectedValue(overrides.refundError)
        : jest.fn().mockResolvedValue({ id: "re_test_1", amount: 2500 }),
    },
  };
}

beforeEach(() => {
  (prisma.auditLog.create as jest.Mock).mockClear();
});

describe("releaseVanDeposit", () => {
  test("keeps a captured deposit when the policy says so", async () => {
    const stripe = makeFakeStripe({ retrieveStatus: "succeeded" });

    const result = await releaseVanDeposit("pi_test_1", "patient_cancelled", { stripe: stripe as any, retainCaptured: true });

    expect(result.status).toBe("retained");
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  test("still lifts an uncaptured hold when the policy keeps deposits", async () => {
    const stripe = makeFakeStripe({ retrieveStatus: "requires_capture" });

    const result = await releaseVanDeposit("pi_test_1", "patient_cancelled", { stripe: stripe as any, retainCaptured: true });

    expect(result.status).toBe("released");
    expect(stripe.paymentIntents.cancel).toHaveBeenCalled();
  });

  test("cancels an authorized (requires_capture) hold", async () => {
    const stripe = makeFakeStripe({ retrieveStatus: "requires_capture" });

    const result = await releaseVanDeposit("pi_test_1", "patient_cancelled", { stripe: stripe as any });

    expect(result.status).toBe("released");
    expect(stripe.paymentIntents.cancel).toHaveBeenCalledWith(
      "pi_test_1",
      undefined,
      { idempotencyKey: "van-deposit-cancel:pi_test_1" }
    );
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  test("cancels an unconfirmed (requires_payment_method) intent", async () => {
    const stripe = makeFakeStripe({ retrieveStatus: "requires_payment_method" });

    const result = await releaseVanDeposit("pi_test_1", "expired", { stripe: stripe as any });

    expect(result.status).toBe("released");
    expect(stripe.paymentIntents.cancel).toHaveBeenCalled();
  });

  test("refunds a captured (succeeded) intent in full", async () => {
    const stripe = makeFakeStripe({ retrieveStatus: "succeeded" });

    const result = await releaseVanDeposit("pi_test_1", "patient_cancelled", { stripe: stripe as any });

    expect(result.status).toBe("refunded");
    expect(result.amountRefundedPence).toBe(2500);
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: "pi_test_1" },
      { idempotencyKey: "van-deposit-refund:pi_test_1" }
    );
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  test("is idempotent for an already-canceled intent", async () => {
    const stripe = makeFakeStripe({ retrieveStatus: "canceled" });

    const result = await releaseVanDeposit("pi_test_1", "operator_declined", { stripe: stripe as any });

    expect(result.status).toBe("already_released");
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  test("reports nothing_to_release for a processing intent", async () => {
    const stripe = makeFakeStripe({ retrieveStatus: "processing" });

    const result = await releaseVanDeposit("pi_test_1", "expired", { stripe: stripe as any });

    expect(result.status).toBe("nothing_to_release");
    expect(stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  });

  test("survives a Stripe retrieve outage without throwing", async () => {
    const stripe = makeFakeStripe({ retrieveError: new Error("network down") });

    const result = await releaseVanDeposit("pi_test_1", "shift_ended", { stripe: stripe as any });

    expect(result.status).toBe("failed");
    expect(result.error).toBeDefined();
  });

  test("survives a cancel failure without throwing", async () => {
    const stripe = makeFakeStripe({
      retrieveStatus: "requires_capture",
      cancelError: new Error("cancel rejected"),
    });

    const result = await releaseVanDeposit("pi_test_1", "patient_cancelled", { stripe: stripe as any });

    expect(result.status).toBe("failed");
  });

  test("survives a refund failure without throwing", async () => {
    const stripe = makeFakeStripe({
      retrieveStatus: "succeeded",
      refundError: new Error("refund rejected"),
    });

    const result = await releaseVanDeposit("pi_test_1", "patient_cancelled", { stripe: stripe as any });

    expect(result.status).toBe("failed");
  });

  test("audit-logs even when the Stripe call fails", async () => {
    const stripe = makeFakeStripe({ retrieveError: new Error("boom") });

    await releaseVanDeposit("pi_test_1", "expired", { stripe: stripe as any });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "van.payment.released",
          resourceId: "pi_test_1",
        }),
      })
    );
  });
});

describe("isDepositAuthorized", () => {
  test("true when the webhook has stamped authorization", async () => {
    expect(await isDepositAuthorized("pi_test_1", new Date())).toBe(true);
  });

  test("false when never stamped", async () => {
    expect(await isDepositAuthorized("pi_test_1", null)).toBe(false);
  });

  test("false when no intent exists", async () => {
    expect(await isDepositAuthorized(null, null)).toBe(false);
  });
});

describe("vanCancellationKeepsDeposit", () => {
  test("refunds before the van sets off and keeps the deposit once it has", () => {
    expect(vanCancellationKeepsDeposit("queued")).toBe(false);
    expect(vanCancellationKeepsDeposit(null)).toBe(false);
    expect(vanCancellationKeepsDeposit("en_route")).toBe(true);
    expect(vanCancellationKeepsDeposit("on_site")).toBe(true);
  });
});
