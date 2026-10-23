import { ShippingTable } from "./_components/shipping-table";

export default function ShippingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Shipping Methods</h1>
        <p className="text-muted-foreground text-sm">Manage shipping options and rates for your shop.</p>
      </div>

      <ShippingTable />
    </div>
  );
}
