import { notFound } from "next/navigation";

import { DiscountForm } from "../_components/discount-form";

async function getDiscount(id: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/v1/admin/discounts/${id}`,
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

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const discount = await getDiscount(id);

  if (!discount) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Edit Discount</h1>
        <p className="text-muted-foreground text-sm">Update discount code details.</p>
      </div>

      <DiscountForm
        discountId={id}
        initialData={{
          code: discount.code,
          type: discount.type,
          value: discount.value.toString(),
          min_order_value: discount.min_order_value?.toString() || "",
          max_uses: discount.max_uses?.toString() || "",
          valid_from: discount.valid_from?.split("T")[0] || "",
          valid_until: discount.valid_until?.split("T")[0] || "",
          is_active: discount.is_active,
        }}
      />
    </div>
  );
}
