"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowUpRight, Package } from "lucide-react";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function TopProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/admin/analytics/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data || []);
        }
      } catch (err) {
        console.error("Failed to load top products:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalSalesVolume = products.reduce((sum, p) => sum + (p.totalSales || 0), 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-normal text-muted-foreground text-sm">Top Selling Products</CardTitle>
        <CardDescription className="text-foreground text-xl tabular-nums leading-none tracking-tight">
          £{totalSalesVolume.toFixed(2)} total revenue
        </CardDescription>
        <CardAction asChild>
          <Link href="/dashboard/products">
            <ArrowUpRight className="size-4" />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">Loading top products...</div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Package className="size-8 mx-auto mb-2 opacity-40" />
            <p>No product sales recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-3">
            <div className="text-muted-foreground text-xs">Product</div>
            <div className="text-muted-foreground text-xs">Units Sold</div>
            <div className="text-muted-foreground text-xs">Revenue</div>

            {products.slice(0, 5).map((product) => (
              <div className="contents text-sm" key={product.id}>
                <div className="min-w-0 flex items-center gap-2">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="size-7 rounded object-cover bg-muted shrink-0"
                  />
                  <div className="truncate font-medium text-xs">{product.name}</div>
                </div>
                <div className="self-center text-muted-foreground tabular-nums text-xs">{product.unitsSold} units</div>
                <div className="self-center font-semibold tabular-nums text-xs">£{product.totalSales.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
