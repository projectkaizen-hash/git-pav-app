import { OrderDetailSheet } from "../_components/order-detail-sheet";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
        <p className="text-muted-foreground text-sm">View and manage order information.</p>
      </div>

      <OrderDetailSheet orderId={id} onClose={() => {}} />
    </div>
  );
}
