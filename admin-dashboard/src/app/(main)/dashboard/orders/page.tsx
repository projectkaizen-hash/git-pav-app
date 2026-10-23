import { OrdersTable } from "./_components/orders-table";

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm">Manage customer orders, track shipments, and process refunds.</p>
      </div>

      <OrdersTable />
    </div>
  );
}
