import { DiscountForm } from "../_components/discount-form";

export default function NewDiscountPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Create Discount</h1>
        <p className="text-muted-foreground text-sm">Create a new discount code for your shop.</p>
      </div>

      <DiscountForm />
    </div>
  );
}
