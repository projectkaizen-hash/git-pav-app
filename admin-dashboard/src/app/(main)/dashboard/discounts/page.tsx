import { DiscountsTable } from "./_components/discounts-table";

export default function DiscountsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Discounts & Coupons</h1>
        <p className="text-muted-foreground text-sm">Manage promotional codes and discounts for your shop.</p>
      </div>

      <DiscountsTable />
    </div>
  );
}
