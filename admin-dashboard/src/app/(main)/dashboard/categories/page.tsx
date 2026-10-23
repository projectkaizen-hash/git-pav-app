import { CategoriesTable } from "./_components/categories-table";

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground text-sm">
          Manage product categories with nesting support for organizing your shop.
        </p>
      </div>

      <CategoriesTable />
    </div>
  );
}
