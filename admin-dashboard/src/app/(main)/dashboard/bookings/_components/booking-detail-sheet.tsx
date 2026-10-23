"use client";

import { useState } from "react";

import { format } from "date-fns";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

export interface Booking {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  service_type: string;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes: string | null;
  created_at: string;
}

interface DetailSheetProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updated: Booking) => void;
}

export function BookingDetailSheet({ booking, isOpen, onClose, onUpdated }: DetailSheetProps) {
  const [status, setStatus] = useState<string>(booking?.status || "pending");
  const [notes, setNotes] = useState<string>(booking?.notes || "");
  const [saving, setSaving] = useState(false);

  if (!booking) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/bookings/${booking?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error("Failed to update booking");
      const updated = await res.json();
      toast.success("Booking updated successfully");
      onUpdated(updated);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error updating booking");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Booking Details</SheetTitle>
            <Badge
              variant={
                booking.status === "confirmed" ? "default" : booking.status === "pending" ? "secondary" : "destructive"
              }
            >
              {booking.status.toUpperCase()}
            </Badge>
          </div>
          <SheetDescription>Created on {format(new Date(booking.created_at), "PPP 'at' p")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-5">
          <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Patient Name</p>
              <p className="text-sm font-semibold">{booking.patient_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Contact Info</p>
              <p className="text-sm">{booking.patient_email}</p>
              {booking.patient_phone && <p className="text-sm text-muted-foreground">{booking.patient_phone}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Requested Service</p>
              <p className="text-sm font-medium">{booking.service_type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Preferred Appointment</p>
              <p className="text-sm">
                {booking.preferred_date ? format(new Date(booking.preferred_date), "PPP") : "Any date"}
                {booking.preferred_time ? ` (${booking.preferred_time})` : ""}
              </p>
            </div>
            {booking.message && (
              <div>
                <p className="text-xs text-muted-foreground">Patient Message</p>
                <p className="text-sm italic text-muted-foreground mt-0.5">{booking.message}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground">Update Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Internal Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this appointment (e.g. called patient, room assigned)..."
                className="mt-1.5 min-h-24 text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
