"use client";

import { useState } from "react";

import { History, Package } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { InventoryLogs } from "./_components/inventory-logs";
import { InventoryTable } from "./_components/inventory-table";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState("stock");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock & Inventory Management</h1>
        <p className="text-sm text-muted-foreground">
          Track clinical inventory, monitor low-stock alerts, adjust quantities, and inspect audit logs.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-80 grid-cols-2">
          <TabsTrigger value="stock" className="gap-2 text-xs">
            <Package className="size-3.5" />
            <span>Stock Levels</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2 text-xs">
            <History className="size-3.5" />
            <span>Movement Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6">
          <InventoryTable />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <InventoryLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
