"use client";

import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AUDIT_PAGE_SIZE, type AuditEntry, auditDetails, auditPath, pageCount } from "@/lib/pav-appointments";
import { appRequest, ukDateTime } from "@/lib/pav-schedule";

type Page = { logs: AuditEntry[]; total: number };

export function AuditLogTable() {
  const [draft, setDraft] = useState({ action: "", resourceId: "" });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page>({ logs: [], total: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await appRequest<Page>(auditPath(filters, page)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load the audit log");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = pageCount(data.total, AUDIT_PAGE_SIZE);

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="flex h-40 items-center justify-center text-muted-foreground">Loading the audit log...</div>
    );
  } else if (data.logs.length === 0) {
    content = <p className="text-muted-foreground text-sm">No entries match.</p>;
  } else {
    content = (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Record</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.logs.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="whitespace-nowrap">{ukDateTime(entry.timestampUtc)}</TableCell>
                <TableCell>
                  <div>{entry.actorEmail ?? "System"}</div>
                  {entry.actorRole ? <div className="text-muted-foreground text-xs">{entry.actorRole}</div> : null}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {entry.action}
                  {entry.archived ? (
                    <Badge variant="outline" className="ml-2">
                      Archived
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="max-w-40 truncate font-mono text-xs">
                  {entry.resourceId ? (
                    <button
                      type="button"
                      className="underline-offset-2 hover:underline"
                      title="Show this record's history"
                      onClick={() => {
                        const next = { action: "", resourceId: entry.resourceId ?? "" };
                        setDraft(next);
                        setFilters(next);
                        setPage(1);
                      }}
                    >
                      {entry.resourceId}
                    </button>
                  ) : null}
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal text-sm">{auditDetails(entry)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
          setPage(1);
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="audit-action">Action starts with</Label>
          <Input
            id="audit-action"
            placeholder="admin."
            value={draft.action}
            onChange={(e) => setDraft({ ...draft, action: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="audit-resource">Record ID</Label>
          <Input
            id="audit-resource"
            placeholder="Appointment or patient ID"
            value={draft.resourceId}
            onChange={(e) => setDraft({ ...draft, resourceId: e.target.value })}
          />
        </div>
        <Button type="submit">Filter</Button>
      </form>

      {content}

      <div className="flex items-center justify-between text-muted-foreground text-sm">
        <span>
          {data.total} entr{data.total === 1 ? "y" : "ies"} · page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
