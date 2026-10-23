import { notFound } from "next/navigation";

import { ShippingForm } from "../_components/shipping-form";

async function getShippingMethod(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/v1/admin/shipping/${id}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function EditShippingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const method = await getShippingMethod(id);

  if (!method) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Edit Shipping Method</h1>
        <p className="text-muted-foreground text-sm">Update shipping method details.</p>
      </div>

      <ShippingForm
        shippingId={id}
        initialData={{
          name: method.name,
          description: method.description || "",
          base_price: method.base_price.toString(),
          free_shipping_threshold: method.free_shipping_threshold?.toString() || "",
          estimated_days: method.estimated_days?.toString() || "",
          is_active: method.is_active,
          sort_order: method.sort_order.toString(),
        }}
      />
    </div>
  );
}
