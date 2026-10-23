"use client";

import { useEffect, useState } from "react";

import { ArrowDownRight, ArrowUpRight, History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function InventoryLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/inventory/logs?limit=50");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load inventory logs", err);
    } finally {
      setLoading(false);
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case "restock":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Restock</Badge>;
      case "sale":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Customer Sale</Badge>;
      case "return":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Return</Badge>;
      case "manual_adjustment":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Audit Count</Badge>;
      default:
        return <Badge variant="outline">{reason}</Badge>;
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-muted-foreground">Loading stock movement logs...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-muted-foreground">
        <History className="size-8 mx-auto mb-2 opacity-40" />
        <p>No inventory movements logged yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table className="text-xs">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Product & SKU</TableHead>
            <TableHead>Change</TableHead>
            <TableHead>Previous → New</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const isPositive = log.quantity_change > 0;
            return (
              <TableRow key={log.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{log.product_name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{log.sku}</p>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isPositive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                    {isPositive ? `+${log.quantity_change}` : log.quantity_change}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  {log.previous_qty} → <span className="font-bold text-foreground">{log.new_qty}</span>
                </TableCell>
                <TableCell>{getReasonBadge(log.reason)}</TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">{log.notes || "—"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
