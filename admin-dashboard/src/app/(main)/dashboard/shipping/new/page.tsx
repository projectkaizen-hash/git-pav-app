import { ShippingForm } from "../_components/shipping-form";

export default function NewShippingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Create Shipping Method</h1>
        <p className="text-muted-foreground text-sm">Create a new shipping method for your shop.</p>
      </div>

      <ShippingForm />
    </div>
  );
}
