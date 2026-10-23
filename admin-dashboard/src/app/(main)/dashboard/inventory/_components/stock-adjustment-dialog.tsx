"use client";

import { useState } from "react";

import { X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface StockAdjustmentDialogProps {
  variant: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function StockAdjustmentDialog({ variant, onClose, onSuccess }: StockAdjustmentDialogProps) {
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [quantity, setQuantity] = useState("10");
  const [reason, setReason] = useState<string>("restock");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    const change = adjustmentType === "add" ? qty : -qty;

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: variant.variant_id,
          quantityChange: change,
          reason,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Adjustment failed");
      }

      toast.success("Inventory adjusted successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust stock");
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedNewQty =
    adjustmentType === "add"
      ? variant.stock_qty + (parseInt(quantity, 10) || 0)
      : Math.max(0, variant.stock_qty - (parseInt(quantity, 10) || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-background rounded-xl border max-w-md w-full p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">Adjust Stock Level</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {variant.product_name} · <span className="font-mono">{variant.sku}</span>
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border text-xs">
            <span className="text-muted-foreground">Current Stock:</span>
            <span className="font-bold text-sm">{variant.stock_qty} units</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Operation</Label>
              <Select value={adjustmentType} onValueChange={(val: any) => setAdjustmentType(val)}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock (+)</SelectItem>
                  <SelectItem value="remove">Deduct Stock (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Quantity Units</Label>
              <Input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Audit Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restock">Restock / Shipment Arrival</SelectItem>
                <SelectItem value="manual_adjustment">Manual Clinical Audit / Recount</SelectItem>
                <SelectItem value="return">Patient Return</SelectItem>
                <SelectItem value="sale">Off-Platform Sale / Prescription</SelectItem>
                <SelectItem value="release">Damaged / Expired Lot Release</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Notes / Batch Ref</Label>
            <Textarea
              placeholder="e.g. Received PO-8924 from London distributor"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 text-xs"
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs">
            <span className="font-medium text-primary">Resulting New Stock:</span>
            <span className="font-bold text-primary text-sm">{calculatedNewQty} units</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Applying..." : "Confirm Adjustment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
