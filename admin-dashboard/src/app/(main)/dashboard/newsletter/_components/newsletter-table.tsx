"use client";

import { useCallback, useEffect, useState } from "react";

import { format } from "date-fns";
import { Download, Mail, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  subscribed_at: string;
  is_active: boolean;
}

export function NewsletterTable() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await fetch(`/api/v1/admin/newsletter?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setSubscribers(json.data || []);
    } catch {
      toast.error("Failed to load newsletter subscribers");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchSubscribers, 300);
    return () => clearTimeout(timer);
  }, [fetchSubscribers]);

  async function deleteSubscriber(id: string) {
    if (!confirm("Remove this email from the subscriber list?")) return;
    try {
      const res = await fetch(`/api/v1/admin/newsletter/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      toast.success("Subscriber removed");
    } catch {
      toast.error("Failed to remove subscriber");
    }
  }

  function exportCSV() {
    if (subscribers.length === 0) {
      toast.error("No subscribers to export");
      return;
    }

    const headers = ["Email", "Name", "Subscribed At", "Status"];
    const rows = subscribers.map((s) => [s.email, s.name || "", s.subscribed_at, s.is_active ? "Active" : "Inactive"]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pavdental_newsletter_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
        <Card className="p-4 shadow-xs">
          <CardContent className="p-0 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Subscribers</p>
              <p className="text-2xl font-bold tracking-tight mt-1">{subscribers.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <Mail className="size-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table & actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="size-4 mr-1.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchSubscribers}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subscriber Email</TableHead>
              <TableHead>Subscriber Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Subscribed Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  Loading subscribers...
                </TableCell>
              </TableRow>
            ) : subscribers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Users className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                  No subscribers found.
                </TableCell>
              </TableRow>
            ) : (
              subscribers.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium text-sm">{sub.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sub.name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={sub.is_active ? "default" : "secondary"}>
                      {sub.is_active ? "Active" : "Unsubscribed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(sub.subscribed_at), "PPP")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => deleteSubscriber(sub.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
