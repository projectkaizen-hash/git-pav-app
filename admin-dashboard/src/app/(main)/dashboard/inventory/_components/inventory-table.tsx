"use client";

import { useEffect, useState } from "react";

import { Layers, PackageCheck, PackageX, Search, SlidersHorizontal, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

export function InventoryTable() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedVariantForAdjust, setSelectedVariantForAdjust] = useState<any | null>(null);

  useEffect(() => {
    fetchInventory();
  }, [filter, search]);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("filter", filter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/v1/admin/inventory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInventory(data.inventory || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Strip */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-muted text-foreground">
              <Layers className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Units in Stock</p>
              <p className="text-xl font-bold">{stats.totalUnits}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
              <PackageCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Adequate Stock</p>
              <p className="text-xl font-bold text-green-600">{stats.inStock}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              <TriangleAlert className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Stock Alert (&le;10)</p>
              <p className="text-xl font-bold text-amber-600">{stats.lowStock}</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
              <PackageX className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Out of Stock</p>
              <p className="text-xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: "all", label: "All Variants" },
            { id: "low_stock", label: "Low Stock" },
            { id: "out_of_stock", label: "Out of Stock" },
            { id: "in_stock", label: "In Stock" },
          ].map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant={filter === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.id)}
              className="text-xs h-8 rounded-lg"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <Table className="text-xs">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Product / Variant</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Attributes</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Loading inventory data...
                </TableCell>
              </TableRow>
            ) : inventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  No inventory items match your current filter.
                </TableCell>
              </TableRow>
            ) : (
              inventory.map((row) => {
                const isOut = row.stock_qty <= 0;
                const isLow = row.stock_qty > 0 && row.stock_qty <= 10;

                return (
                  <TableRow key={row.variant_id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            row.image ||
                            "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80"
                          }
                          alt={row.product_name}
                          className="size-9 rounded-md object-cover bg-muted shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-foreground">{row.product_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Base: £{parseFloat(row.base_price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono font-medium">{row.sku}</TableCell>

                    <TableCell>
                      {row.attributes && typeof row.attributes === "object" ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(row.attributes).map(([k, v]) => (
                            <Badge key={k} variant="secondary" className="text-[10px] font-normal">
                              {k}: {String(v)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="font-bold text-sm">{row.stock_qty} units</span>
                    </TableCell>

                    <TableCell>
                      {isOut ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Out of Stock
                        </Badge>
                      ) : isLow ? (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 text-[10px]">
                          Low Stock ({row.stock_qty})
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200 text-[10px]">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedVariantForAdjust(row)}
                        className="h-7 text-xs gap-1.5"
                      >
                        <SlidersHorizontal className="size-3" />
                        <span>Adjust</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Adjustment Dialog Modal */}
      {selectedVariantForAdjust && (
        <StockAdjustmentDialog
          variant={selectedVariantForAdjust}
          onClose={() => setSelectedVariantForAdjust(null)}
          onSuccess={fetchInventory}
        />
      )}
    </div>
  );
}
