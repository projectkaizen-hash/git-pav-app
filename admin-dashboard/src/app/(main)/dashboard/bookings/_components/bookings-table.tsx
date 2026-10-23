"use client";

import { useCallback, useEffect, useState } from "react";

import { format } from "date-fns";
import { Check, Eye, MoreHorizontal, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { type Booking, BookingDetailSheet } from "./booking-detail-sheet";

export function BookingsTable({
  onCountChange,
}: {
  onCountChange?: (stats: { total: number; pending: number; confirmed: number; cancelled: number }) => void;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/v1/admin/bookings?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setBookings(json.data || []);

      if (onCountChange) {
        const total = json.total || 0;
        const pending = (json.data || []).filter((b: Booking) => b.status === "pending").length;
        const confirmed = (json.data || []).filter((b: Booking) => b.status === "confirmed").length;
        const cancelled = (json.data || []).filter((b: Booking) => b.status === "cancelled").length;
        onCountChange({ total, pending, confirmed, cancelled });
      }
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, onCountChange]);

  useEffect(() => {
    const timer = setTimeout(fetchBookings, 300);
    return () => clearTimeout(timer);
  }, [fetchBookings]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/v1/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(`Booking marked as ${status}`);
      fetchBookings();
    } catch {
      toast.error("Status update failed");
    }
  }

  async function deleteBooking(id: string) {
    if (!confirm("Are you sure you want to delete this booking?")) return;
    try {
      const res = await fetch(`/api/v1/admin/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Booking deleted");
      fetchBookings();
    } catch {
      toast.error("Failed to delete booking");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search patient, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchBookings} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Preferred Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Loading bookings...
                </TableCell>
              </TableRow>
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setSheetOpen(true);
                  }}
                >
                  <TableCell>
                    <p className="font-semibold text-sm">{booking.patient_name}</p>
                    <p className="text-xs text-muted-foreground">{booking.patient_email}</p>
                    {booking.patient_phone && <p className="text-xs text-muted-foreground">{booking.patient_phone}</p>}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-sm">{booking.service_type}</span>
                  </TableCell>
                  <TableCell>
                    {booking.preferred_date ? (
                      <span className="text-sm">{format(new Date(booking.preferred_date), "MMM d, yyyy")}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Flexible</span>
                    )}
                    {booking.preferred_time && (
                      <p className="text-xs text-muted-foreground">{booking.preferred_time}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        booking.status === "confirmed"
                          ? "default"
                          : booking.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {booking.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(booking.created_at), "MMM d, p")}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedBooking(booking);
                            setSheetOpen(true);
                          }}
                        >
                          <Eye className="size-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        {booking.status !== "confirmed" && (
                          <DropdownMenuItem onClick={() => updateStatus(booking.id, "confirmed")}>
                            <Check className="size-4 mr-2 text-emerald-500" /> Confirm
                          </DropdownMenuItem>
                        )}
                        {booking.status !== "cancelled" && (
                          <DropdownMenuItem onClick={() => updateStatus(booking.id, "cancelled")}>
                            <X className="size-4 mr-2 text-rose-500" /> Cancel
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => deleteBooking(booking.id)} className="text-destructive">
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BookingDetailSheet
        booking={selectedBooking}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpdated={() => fetchBookings()}
      />
    </div>
  );
}
