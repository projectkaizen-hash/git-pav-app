"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { Edit2, Plus, Search, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Discount {
  id: string;
  code: string;
  type: "percentage" | "fixed_amount";
  value: string;
  min_order_value: string | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  current_status: "active" | "expired" | "upcoming";
}

export function DiscountsTable() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const url = showActiveOnly ? "/api/v1/admin/discounts?is_active=true" : "/api/v1/admin/discounts";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch discounts");
      const data = await res.json();
      setDiscounts(data);
    } catch {
      toast.error("Failed to load discounts");
    } finally {
      setLoading(false);
    }
  }, [showActiveOnly]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/v1/admin/discounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update discount");
      toast.success("Discount updated");
      fetchDiscounts();
    } catch {
      toast.error("Failed to update discount");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;
    try {
      const res = await fetch(`/api/v1/admin/discounts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete discount");
      toast.success("Discount deleted");
      fetchDiscounts();
    } catch {
      toast.error("Failed to delete discount");
    }
  };

  const filteredDiscounts = discounts.filter((d) => d.code.toLowerCase().includes(search.toLowerCase()));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      upcoming: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    };
    return <Badge className={colors[status as keyof typeof colors] || ""}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading discounts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search discounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="active-only" checked={showActiveOnly} onCheckedChange={setShowActiveOnly} />
            <label htmlFor="active-only" className="text-sm text-muted-foreground">
              Active only
            </label>
          </div>
        </div>
        <Link href="/dashboard/discounts/new">
          <Button>
            <Plus className="size-4 mr-2" />
            Add Discount
          </Button>
        </Link>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Valid Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDiscounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No discounts found
                </TableCell>
              </TableRow>
            ) : (
              filteredDiscounts.map((discount) => (
                <TableRow key={discount.id}>
                  <TableCell className="font-medium">{discount.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{discount.type}</Badge>
                  </TableCell>
                  <TableCell>{discount.type === "percentage" ? `${discount.value}%` : `£${discount.value}`}</TableCell>
                  <TableCell>
                    {discount.used_count} / {discount.max_uses || "∞"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(discount.valid_from)}
                    {discount.valid_until && ` → ${formatDate(discount.valid_until)}`}
                  </TableCell>
                  <TableCell>{getStatusBadge(discount.current_status)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={discount.is_active}
                      onCheckedChange={() => handleToggleActive(discount.id, discount.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/discounts/${discount.id}`}>
                        <Button size="icon-sm" variant="ghost">
                          <Edit2 className="size-4" />
                        </Button>
                      </Link>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(discount.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
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
