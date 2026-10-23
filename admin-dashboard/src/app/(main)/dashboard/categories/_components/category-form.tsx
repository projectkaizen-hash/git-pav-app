"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface CategoryFormData {
  name: string;
  slug: string;
  parent_id: string;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

interface CategoryFormProps {
  categoryId?: string;
  initialData?: CategoryFormData;
}

export function CategoryForm({ categoryId, initialData }: CategoryFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>(
    initialData || {
      name: "",
      slug: "",
      parent_id: "",
      description: "",
      image_url: "",
      sort_order: 0,
      is_active: true,
    },
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/v1/admin/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      // Filter out current category if editing
      const filtered = categoryId ? data.filter((c: any) => c.id !== categoryId) : data;
      setCategories(filtered);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: prev.slug || generateSlug(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = categoryId ? `/api/v1/admin/categories/${categoryId}` : "/api/v1/admin/categories";
      const method = categoryId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          parent_id: formData.parent_id || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save category");
      }

      toast.success(categoryId ? "Category updated successfully" : "Category created successfully");
      router.push("/dashboard/categories");
    } catch (error: any) {
      toast.error(error.message || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard/categories">
          <ArrowLeft className="size-4 mr-2" />
          Back to Categories
        </Link>
      </Button>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Teeth Whitening"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="e.g., teeth-whitening"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="parent">Parent Category</Label>
            <Select
              value={formData.parent_id}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, parent_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No parent (root category)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No parent (root category)</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Category description..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => setFormData((prev) => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="sort_order">Sort Order</Label>
            <Input
              id="sort_order"
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              min="0"
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : categoryId ? "Update Category" : "Create Category"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/categories">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
