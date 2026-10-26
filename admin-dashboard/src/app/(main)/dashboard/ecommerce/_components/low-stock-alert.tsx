"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { AlertTriangle, ArrowUpRight, Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface LowStockItem {
  variant_id: string;
  sku: string;
  attributes: Record<string, string>;
  stock_qty: number;
  product_name: string;
  product_slug: string;
  image: string;
}

export function LowStockAlert() {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLowStock() {
      try {
        const res = await fetch("/api/v1/admin/inventory?filter=low_stock&limit=5");
        if (res.ok) {
          const data = await res.json();
          if (data.inventory) {
            setLowStockItems(data.inventory.slice(0, 5));
          }
        }
      } catch (err) {
        console.error("Failed to load low stock items:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLowStock();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-normal text-muted-foreground text-sm">Low Stock Alerts</CardTitle>
          <CardDescription className="text-foreground text-xl tabular-nums leading-none tracking-tight">
            Loading...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lowStockItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-normal text-muted-foreground text-sm">Low Stock Alerts</CardTitle>
          <CardDescription className="text-foreground text-xl tabular-nums leading-none tracking-tight">
            All good
          </CardDescription>
          <CardAction>
            <Link href="/dashboard/inventory">
              <ArrowUpRight className="size-4" />
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No low stock items</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal text-muted-foreground text-sm">Low Stock Alerts</CardTitle>
        <CardDescription className="text-foreground text-xl tabular-nums leading-none tracking-tight">
          {lowStockItems.length} items
        </CardDescription>
        <CardAction>
          <Link href="/dashboard/inventory?filter=low_stock">
            <ArrowUpRight className="size-4" />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {lowStockItems.map((item) => (
          <div key={item.variant_id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40 border">
            <img
              src={
                item.image ||
                "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=100&q=80"
              }
              alt={item.product_name}
              className="size-10 rounded-md object-cover bg-muted"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{item.product_name}</p>
              <p className="text-[11px] text-muted-foreground">{item.sku}</p>
            </div>
            <div className="flex items-center gap-1.5 text-amber-600">
              <AlertTriangle className="size-3.5" />
              <span className="text-xs font-bold">{item.stock_qty} left</span>
            </div>
          </div>
        ))}

        <Button asChild variant="outline" size="sm" className="w-full mt-2">
          <Link href="/dashboard/inventory?filter=low_stock">View All Low Stock</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
