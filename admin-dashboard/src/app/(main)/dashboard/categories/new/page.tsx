import { CategoryForm } from "../_components/category-form";

export default function NewCategoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">New Category</h1>
        <p className="text-muted-foreground text-sm">Create a new product category to organize your shop.</p>
      </div>

      <CategoryForm />
    </div>
  );
}
