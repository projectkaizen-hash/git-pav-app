"use client";

import { use, useEffect, useState } from "react";

import Link from "next/link";

import { Package } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ProductForm } from "../../_components/product-form";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/admin/products/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setProduct(data);
      } catch {
        // error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading product details...</div>;
  }

  if (!product) {
    return <div className="p-8 text-center text-destructive">Product not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground text-sm">Update product details, pricing, and manage variants.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/products/${id}/variants`}>
            <Package className="size-4 mr-2" />
            Manage Variants
          </Link>
        </Button>
      </div>

      <ProductForm
        initialData={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          category_id: product.category_id,
          price: product.price,
          original_price: product.original_price,
          short_desc: product.short_desc,
          full_desc: product.full_desc,
          features: product.features,
          how_to_use: product.how_to_use,
          badge: product.badge,
          in_stock: product.in_stock,
          published: product.published,
          image: product.images?.[0]?.url || product.image,
        }}
      />
    </div>
  );
}
