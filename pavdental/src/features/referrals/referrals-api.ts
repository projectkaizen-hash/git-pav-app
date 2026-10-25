import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/features/auth/auth-api";

// Refer-a-friend (D-03): the patient's code and the vouchers it has earned.
// The server never says who the friends are.

export interface ReferralVoucher {
  voucherCode: string;
  amountPence: number;
  issuedAt: string | null;
  usedAt: string | null;
}

export interface ReferralSummary {
  code: string;
  voucherPence: number;
  minVisitPence: number;
  friendsJoined: number;
  vouchers: ReferralVoucher[];
}

export async function fetchReferrals(): Promise<ReferralSummary> {
  const res = await authFetch("/api/referrals");
  if (!res.ok) throw new Error("Could not load your referral code");
  return res.json();
}

export function useReferrals() {
  return useQuery({ queryKey: ["referrals"], queryFn: fetchReferrals });
}

export const formatPounds = (pence: number) => `£${(pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)}`;

/** The message the share sheet offers. */
export function referralShareMessage(code: string) {
  return `I use Pav Dental for my dental care. If you sign up in the Pav Dental app, enter my code ${code}.`;
}
