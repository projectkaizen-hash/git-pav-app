import { VoucherLookup } from "./_components/voucher-lookup";

export default function ReferralVouchersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-3xl tracking-tight">Referral vouchers</h1>
        <p className="text-muted-foreground text-sm">
          A patient earns £25 off their bill when a friend who signed up with their code completes a visit over £150.
          Look up the code the patient shows you, check it's theirs, then mark it used when you take £25 off.
        </p>
      </div>

      <VoucherLookup />
    </div>
  );
}
