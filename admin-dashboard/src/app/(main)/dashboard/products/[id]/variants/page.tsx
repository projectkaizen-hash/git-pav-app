import { VariantsManager } from "./_components/variants-manager";

export default function ProductVariantsPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Product Variants</h1>
        <p className="text-muted-foreground text-sm">
          Manage product variants with different attributes, pricing, and stock levels.
        </p>
      </div>

      <VariantsManager productId={params.id} />
    </div>
  );
}
