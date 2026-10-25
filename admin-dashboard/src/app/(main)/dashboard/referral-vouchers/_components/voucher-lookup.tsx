"use client";

import { type FormEvent, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appRequest, ukDateTime } from "@/lib/pav-schedule";

interface ReferralVoucher {
  voucherCode: string;
  amountPence: number;
  issuedAt: string | null;
  usedAt: string | null;
  patientName: string | null;
  patientEmail: string;
}

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;
// Staff may type "ref 8hn3tq"; the backend accepts it with or without the prefix.
const tidy = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

export function VoucherLookup() {
  const [code, setCode] = useState("");
  const [voucher, setVoucher] = useState<ReferralVoucher | null>(null);
  const [busy, setBusy] = useState(false);

  const lookUp = async (event: FormEvent) => {
    event.preventDefault();
    const wanted = tidy(code);
    if (!wanted) return;
    setBusy(true);
    setVoucher(null);
    try {
      setVoucher(await appRequest<ReferralVoucher>(`referral-vouchers/${encodeURIComponent(wanted)}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to look up the voucher");
    } finally {
      setBusy(false);
    }
  };

  const markUsed = async () => {
    if (!voucher) return;
    const confirmed = confirm(
      `Take ${pounds(voucher.amountPence)} off ${voucher.patientName ?? "this patient"}'s bill and mark ${voucher.voucherCode} as used? It can only be used once.`,
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      setVoucher(await appRequest<ReferralVoucher>(`referral-vouchers/${voucher.voucherCode}/use`, { method: "POST" }));
      toast.success("Voucher marked as used");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark the voucher as used");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <form onSubmit={lookUp} className="flex items-end gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="voucher-code">Voucher code</Label>
          <Input
            id="voucher-code"
            placeholder="REF-XXXXXX"
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy || !tidy(code)}>
          Look up
        </Button>
      </form>

      {voucher && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono font-semibold text-lg">{voucher.voucherCode}</span>
            {voucher.usedAt ? <Badge variant="secondary">Used</Badge> : <Badge>Ready to use</Badge>}
          </div>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
            <dt className="text-muted-foreground">Amount</dt>
            <dd>{pounds(voucher.amountPence)} off the bill</dd>
            <dt className="text-muted-foreground">Patient</dt>
            <dd>
              {voucher.patientName ?? "Unknown"} · {voucher.patientEmail}
            </dd>
            <dt className="text-muted-foreground">Earned</dt>
            <dd>{voucher.issuedAt ? ukDateTime(voucher.issuedAt) : "—"}</dd>
            {voucher.usedAt && (
              <>
                <dt className="text-muted-foreground">Used</dt>
                <dd>{ukDateTime(voucher.usedAt)}</dd>
              </>
            )}
          </dl>
          {!voucher.usedAt && (
            <Button onClick={markUsed} disabled={busy} className="self-start">
              Take {pounds(voucher.amountPence)} off and mark used
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
