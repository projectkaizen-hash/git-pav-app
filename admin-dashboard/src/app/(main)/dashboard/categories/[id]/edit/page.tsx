import { CategoryForm } from "../../_components/category-form";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Edit Category</h1>
        <p className="text-muted-foreground text-sm">Update category details and settings.</p>
      </div>

      <CategoryForm categoryId={id} />
    </div>
  );
}
