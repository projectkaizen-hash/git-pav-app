"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";

import { Edit2, Package, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  category_label: string | null;
  category_name: string | null;
  price: string;
  original_price: string | null;
  badge: string | null;
  in_stock: boolean;
  published: boolean;
  image: string | null;
  variant_count: number;
  total_stock: number;
}

export function ProductsTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const url = categoryFilter ? `/api/v1/admin/products?category_id=${categoryFilter}` : "/api/v1/admin/products";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast.error("Failed to load categories");
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  async function toggleStock(id: string, in_stock: boolean) {
    try {
      const res = await fetch(`/api/v1/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_stock }),
      });
      if (!res.ok) throw new Error("Update failed");
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, in_stock } : p)));
      toast.success("Stock status updated");
    } catch {
      toast.error("Failed to update stock status");
    }
  }

  async function togglePublish(id: string, published: boolean) {
    try {
      const res = await fetch(`/api/v1/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published }),
      });
      if (!res.ok) throw new Error("Update failed");
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, published } : p)));
      toast.success("Publish status updated");
    } catch {
      toast.error("Failed to update publish status");
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/v1/admin/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Product deleted");
      fetchProducts();
    } catch {
      toast.error("Failed to delete product");
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category_name && p.category_name.toLowerCase().includes(search.toLowerCase())) ||
      (p.category_label && p.category_label.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/products/new">
            <Plus className="size-4 mr-1.5" /> Add Product
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {products.length === 0 ? (
                    <>No products available. Click "Add Product" to create your first product.</>
                  ) : (
                    <>No products found matching your search.</>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt={product.name}
                          className="size-10 rounded-md object-cover border"
                        />
                      ) : (
                        <div className="size-10 rounded-md bg-muted flex items-center justify-center text-xs font-semibold">
                          IMG
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{product.name}</p>
                        {product.badge && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 mt-0.5">
                            {product.badge}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {product.category_name || product.category_label || "Uncategorized"}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-sm">£{parseFloat(product.price).toFixed(2)}</span>
                    {product.original_price && (
                      <span className="text-xs text-muted-foreground line-through ml-1.5">
                        £{parseFloat(product.original_price).toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Package className="size-3 text-muted-foreground" />
                      <span className="text-sm">{product.variant_count}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.total_stock > 0 ? "default" : "destructive"}>{product.total_stock}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.published ? "default" : "secondary"}>
                      {product.published ? "Live" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild className="size-8">
                        <Link href={`/dashboard/products/${product.id}/variants`}>
                          <Package className="size-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild className="size-8">
                        <Link href={`/dashboard/products/${product.id}/edit`}>
                          <Edit2 className="size-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => deleteProduct(product.id)}
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
    </div>
  );
}
