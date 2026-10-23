"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { appRequest, type ErasureRequest, ukDate } from "@/lib/pav-schedule";

type Status = ErasureRequest["status"];

const SOURCE_LABELS: Record<ErasureRequest["source"], string> = {
  account_deletion: "Closed account",
  patient_request: "Asked in the app",
};

const dateOf = (iso: string) => ukDate(iso.slice(0, 10));

export function ErasureQueue() {
  const [status, setStatus] = useState<Status>("pending");
  const [requests, setRequests] = useState<ErasureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequests(await appRequest<ErasureRequest[]>(`erasure-requests?status=${status}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load erasure requests");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const erase = async (request: ErasureRequest) => {
    const confirmed = confirm(
      `Erase ${request.patient.name ?? "this patient"}? Their login, contact details, saved cards and notifications are removed for good. Their clinical record is kept until its retention date. This can't be undone.`,
    );
    if (!confirmed) return;
    setBusyId(request.id);
    try {
      const result = await appRequest<{ retainUntil: string }>(`erasure-requests/${request.id}/complete`, {
        method: "POST",
      });
      toast.success(`Erased. Clinical record kept until ${ukDate(result.retainUntil)}.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to erase");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (request: ErasureRequest) => {
    const note = prompt(
      "Why is this request being refused? For example: identity not confirmed. The note is kept with the request.",
    );
    if (!note?.trim()) return;
    setBusyId(request.id);
    try {
      await appRequest(`erasure-requests/${request.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ note: note.trim() }),
      });
      toast.success("Request refused");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to refuse the request");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="erasure-status">Show</Label>
        <NativeSelect id="erasure-status" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          <NativeSelectOption value="pending">Waiting</NativeSelectOption>
          <NativeSelectOption value="completed">Erased</NativeSelectOption>
          <NativeSelectOption value="rejected">Refused</NativeSelectOption>
        </NativeSelect>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">Loading requests...</div>
      ) : requests.length === 0 ? (
        <p className="text-muted-foreground text-sm">No requests here.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>{status === "pending" ? "Due" : "Closed"}</TableHead>
                <TableHead>Notes</TableHead>
                {status === "pending" ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div className="font-medium">{request.patient.name ?? "Unknown"}</div>
                    <div className="text-muted-foreground text-xs">{request.patient.email ?? "Erased"}</div>
                  </TableCell>
                  <TableCell>
                    <div>{dateOf(request.requestedAt)}</div>
                    <div className="text-muted-foreground text-xs">
                      {SOURCE_LABELS[request.source] ?? request.source}
                    </div>
                  </TableCell>
                  <TableCell>
                    {status === "pending" ? (
                      <div className="flex flex-col gap-1">
                        <span>{dateOf(request.dueAt)}</span>
                        {request.overdue ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">{request.daysLeft} days left</span>
                        )}
                      </div>
                    ) : request.completedAt ? (
                      dateOf(request.completedAt)
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-sm whitespace-normal text-sm">
                    {request.upcomingBookings > 0 ? (
                      <div className="text-destructive">
                        {request.upcomingBookings} upcoming booking{request.upcomingBookings === 1 ? "" : "s"}: the
                        patient must cancel first.
                      </div>
                    ) : null}
                    {request.reason ? <div>Patient's reason: {request.reason}</div> : null}
                    {request.outcomeNote ? <div>Note: {request.outcomeNote}</div> : null}
                    {request.patient.retainUntil ? (
                      <div className="text-muted-foreground">
                        Clinical record kept until {ukDate(request.patient.retainUntil)}
                      </div>
                    ) : null}
                  </TableCell>
                  {status === "pending" ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busyId === request.id || request.upcomingBookings > 0}
                          onClick={() => erase(request)}
                        >
                          Erase
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === request.id}
                          onClick={() => reject(request)}
                        >
                          Refuse
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
