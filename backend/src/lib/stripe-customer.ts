import Stripe from "stripe";
import { prisma } from "./prisma";

// Deposits are paid as the patient's Stripe Customer, so the payment sheet can
// offer their saved cards and a box to save a new one (decisions log #15).

// The Stripe API version the mobile SDK's PaymentSheet expects for customer
// ephemeral keys.
export const MOBILE_EPHEMERAL_KEY_API_VERSION = "2020-08-27";

/** The patient's Stripe Customer, created on first use. */
export async function ensureStripeCustomer(stripe: Pick<Stripe, "customers">, userId: string): Promise<string | null> {
  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
    select: { id: true, stripeCustomerId: true, firstName: true, lastName: true },
  });
  if (!profile) return null;
  if (profile.stripeCustomerId) return profile.stripeCustomerId;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const customer = await stripe.customers.create(
    {
      email: user?.email,
      name: `${profile.firstName} ${profile.lastName}`,
      metadata: { userId },
    },
    { idempotencyKey: `patient-customer:${profile.id}` }
  );
  // Two first payments at once must end on the same Customer.
  await prisma.patientProfile.updateMany({
    where: { id: profile.id, stripeCustomerId: null },
    data: { stripeCustomerId: customer.id },
  });
  const stored = await prisma.patientProfile.findUniqueOrThrow({ where: { id: profile.id }, select: { stripeCustomerId: true } });
  return stored.stripeCustomerId;
}

/** A short-lived key that lets the app's payment sheet read the Customer's saved cards. */
export async function customerEphemeralKey(stripe: Pick<Stripe, "ephemeralKeys">, customerId: string): Promise<string | null> {
  const key = await stripe.ephemeralKeys.create({ customer: customerId }, { apiVersion: MOBILE_EPHEMERAL_KEY_API_VERSION });
  return key.secret ?? null;
}
