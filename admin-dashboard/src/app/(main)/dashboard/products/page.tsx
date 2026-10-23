import { ProductsTable } from "./_components/products-table";

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Shop Products</h1>
        <p className="text-muted-foreground text-sm">
          Manage clinical whitening systems, sonic toothbrushes, daily hygiene products, prices, and inventory.
        </p>
      </div>

      <ProductsTable />
    </div>
  );
}
