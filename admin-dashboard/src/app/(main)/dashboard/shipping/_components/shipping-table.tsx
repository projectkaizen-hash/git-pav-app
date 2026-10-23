"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { Edit2, Plus, Search, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ShippingMethod {
  id: string;
  name: string;
  description: string | null;
  base_price: string;
  free_shipping_threshold: string | null;
  estimated_days: number | null;
  is_active: boolean;
  sort_order: number;
}

export function ShippingTable() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const url = showActiveOnly ? "/api/v1/admin/shipping?is_active=true" : "/api/v1/admin/shipping";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch shipping methods");
      const data = await res.json();
      setMethods(data);
    } catch {
      toast.error("Failed to load shipping methods");
    } finally {
      setLoading(false);
    }
  }, [showActiveOnly]);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/v1/admin/shipping/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update shipping method");
      toast.success("Shipping method updated");
      fetchMethods();
    } catch {
      toast.error("Failed to update shipping method");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shipping method?")) return;
    try {
      const res = await fetch(`/api/v1/admin/shipping/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete shipping method");
      toast.success("Shipping method deleted");
      fetchMethods();
    } catch {
      toast.error("Failed to delete shipping method");
    }
  };

  const filteredMethods = methods.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading shipping methods...</div>
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
              placeholder="Search shipping methods..."
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
        <Link href="/dashboard/shipping/new">
          <Button>
            <Plus className="size-4 mr-2" />
            Add Shipping Method
          </Button>
        </Link>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Free Shipping</TableHead>
              <TableHead>Est. Days</TableHead>
              <TableHead>Sort Order</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMethods.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No shipping methods found
                </TableCell>
              </TableRow>
            ) : (
              filteredMethods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{method.name}</div>
                      {method.description && <div className="text-sm text-muted-foreground">{method.description}</div>}
                    </div>
                  </TableCell>
                  <TableCell>£{method.base_price}</TableCell>
                  <TableCell>
                    {method.free_shipping_threshold ? `£${method.free_shipping_threshold}+` : "Never"}
                  </TableCell>
                  <TableCell>{method.estimated_days ? `${method.estimated_days} days` : "N/A"}</TableCell>
                  <TableCell>{method.sort_order}</TableCell>
                  <TableCell>
                    <Switch
                      checked={method.is_active}
                      onCheckedChange={() => handleToggleActive(method.id, method.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/shipping/${method.id}`}>
                        <Button size="icon-sm" variant="ghost">
                          <Edit2 className="size-4" />
                        </Button>
                      </Link>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(method.id)}>
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
