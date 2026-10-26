"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { ArrowUpRight, PackageCheck, PackageX, TriangleAlert } from "lucide-react";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function Inventory() {
  const [stats, setStats] = useState<{
    inStock: number;
    lowStock: number;
    outOfStock: number;
    totalUnits: number;
  }>({
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalUnits: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/v1/admin/inventory");
        if (res.ok) {
          const data = await res.json();
          if (data.stats) {
            setStats({
              inStock: data.stats.inStock || 0,
              lowStock: data.stats.lowStock || 0,
              outOfStock: data.stats.outOfStock || 0,
              totalUnits: data.stats.totalUnits || 0,
            });
          }
        }
      } catch (err) {
        console.error("Failed to load inventory stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const totalTrackedVariants = stats.inStock + stats.lowStock + stats.outOfStock;
  const availablePercent = totalTrackedVariants > 0 ? Math.round((stats.inStock / totalTrackedVariants) * 100) : 100;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-normal text-muted-foreground text-sm">Inventory Levels</CardTitle>
        <CardDescription className="text-foreground text-xl tabular-nums leading-none tracking-tight">
          {availablePercent}% available
        </CardDescription>
        <CardAction>
          <Link href="/dashboard/inventory">
            <ArrowUpRight className="size-4" />
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall Stock Health</span>
            <span className="font-semibold text-foreground">{stats.totalUnits} total units</span>
          </div>
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
            {totalTrackedVariants > 0 ? (
              <>
                <div
                  style={{ width: `${(stats.inStock / totalTrackedVariants) * 100}%` }}
                  className="bg-green-500 transition-all"
                  title="In Stock"
                />
                <div
                  style={{ width: `${(stats.lowStock / totalTrackedVariants) * 100}%` }}
                  className="bg-amber-500 transition-all"
                  title="Low Stock"
                />
                <div
                  style={{ width: `${(stats.outOfStock / totalTrackedVariants) * 100}%` }}
                  className="bg-red-500 transition-all"
                  title="Out of Stock"
                />
              </>
            ) : (
              <div className="w-full bg-green-500" />
            )}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border text-center">
            <PackageCheck className="size-5 text-green-600 mb-1" />
            <span className="text-xs text-muted-foreground">In Stock</span>
            <span className="text-base font-bold text-foreground mt-0.5">{stats.inStock}</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border text-center">
            <TriangleAlert className="size-5 text-amber-600 mb-1" />
            <span className="text-xs text-muted-foreground">Low (&le;10)</span>
            <span className="text-base font-bold text-foreground mt-0.5">{stats.lowStock}</span>
          </div>

          <div className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border text-center">
            <PackageX className="size-5 text-red-600 mb-1" />
            <span className="text-xs text-muted-foreground">Out of Stock</span>
            <span className="text-base font-bold text-foreground mt-0.5">{stats.outOfStock}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
