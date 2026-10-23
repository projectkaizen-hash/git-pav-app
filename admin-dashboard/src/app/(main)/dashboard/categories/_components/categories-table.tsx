"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { Edit2, Folder, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  parent_name: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
}

export function CategoriesTable() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function toggleActive(id: string, is_active: boolean) {
    try {
      const res = await fetch(`/api/v1/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error("Update failed");
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, is_active } : c)));
      toast.success("Category status updated");
    } catch {
      toast.error("Failed to update category status");
    }
  }

  function handleDeleteClick(category: Category) {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  }

  async function deleteCategory() {
    if (!categoryToDelete) return;

    try {
      const res = await fetch(`/api/v1/admin/categories/${categoryToDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Delete failed");
      }
      toast.success("Category deleted");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    }
  }

  const filtered = categories.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/categories/new">
            <Plus className="size-4 mr-1.5" /> Add Category
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Loading categories...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {categories.length === 0 ? (
                    <>No categories available. Click "Add Category" to create your first category.</>
                  ) : (
                    <>No categories found matching your search.</>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center">
                        <Folder className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{category.name}</p>
                        {category.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{category.description}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{category.slug}</TableCell>
                  <TableCell className="text-sm">{category.parent_name || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{category.product_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={category.is_active}
                      onCheckedChange={(checked) => toggleActive(category.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild className="size-8">
                        <Link href={`/dashboard/categories/${category.id}/edit`}>
                          <Edit2 className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteCategory}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
