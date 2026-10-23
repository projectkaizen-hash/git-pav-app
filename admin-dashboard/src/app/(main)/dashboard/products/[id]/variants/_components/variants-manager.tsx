"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Edit2, Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Variant {
  id: string;
  product_id: string;
  sku: string;
  attributes: Record<string, string>;
  price_override: number | null;
  stock_qty: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VariantFormData {
  sku: string;
  attributes: Record<string, string>;
  price_override: string;
  stock_qty: string;
  is_active: boolean;
}

interface VariantsManagerProps {
  productId: string;
}

export function VariantsManager({ productId }: VariantsManagerProps) {
  const router = useRouter();
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [formData, setFormData] = useState<VariantFormData>({
    sku: "",
    attributes: {},
    price_override: "",
    stock_qty: "0",
    is_active: true,
  });

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${productId}/variants`);
      if (!res.ok) throw new Error("Failed to fetch variants");
      const data = await res.json();
      setVariants(data);
    } catch {
      toast.error("Failed to load variants");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const handleAddVariant = () => {
    setEditingVariant(null);
    setFormData({
      sku: "",
      attributes: {},
      price_override: "",
      stock_qty: "0",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleEditVariant = (variant: Variant) => {
    setEditingVariant(variant);
    setFormData({
      sku: variant.sku,
      attributes: variant.attributes,
      price_override: variant.price_override?.toString() || "",
      stock_qty: variant.stock_qty.toString(),
      is_active: variant.is_active,
    });
    setDialogOpen(true);
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Are you sure you want to delete this variant?")) return;

    try {
      const res = await fetch(`/api/v1/admin/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Delete failed");
      }
      toast.success("Variant deleted successfully");
      fetchVariants();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete variant");
    }
  };

  const handleAttributeChange = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: value,
      },
    }));
  };

  const handleAddAttribute = () => {
    const key = prompt("Enter attribute name (e.g., size, color):");
    if (!key) return;
    setFormData((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: "",
      },
    }));
  };

  const handleRemoveAttribute = (key: string) => {
    setFormData((prev) => {
      const newAttributes = { ...prev.attributes };
      delete newAttributes[key];
      return { ...prev, attributes: newAttributes };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || Object.keys(formData.attributes).length === 0) {
      toast.error("SKU and at least one attribute are required");
      return;
    }

    try {
      const url = editingVariant
        ? `/api/v1/admin/products/${productId}/variants/${editingVariant.id}`
        : `/api/v1/admin/products/${productId}/variants`;
      const method = editingVariant ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          price_override: formData.price_override ? parseFloat(formData.price_override) : null,
          stock_qty: parseInt(formData.stock_qty) || 0,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Save failed");
      }

      toast.success(editingVariant ? "Variant updated successfully" : "Variant created successfully");
      setDialogOpen(false);
      fetchVariants();
    } catch (error: any) {
      toast.error(error.message || "Failed to save variant");
    }
  };

  const formatAttributes = (attributes: Record<string, string>) => {
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/dashboard/products">
            <ArrowLeft className="size-4 mr-2" />
            Back to Products
          </Link>
        </Button>
        <Button onClick={handleAddVariant}>
          <Plus className="size-4 mr-2" />
          Add Variant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product Variants</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading variants...</div>
          ) : variants.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="size-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No variants yet. Click "Add Variant" to create your first variant.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Attributes</TableHead>
                  <TableHead>Price Override</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                    <TableCell className="text-sm">{formatAttributes(variant.attributes)}</TableCell>
                    <TableCell>
                      {variant.price_override ? (
                        <span className="font-semibold">£{variant.price_override.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Base price</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant.stock_qty > 0 ? "default" : "destructive"}>{variant.stock_qty}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={variant.is_active ? "default" : "secondary"}>
                        {variant.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleEditVariant(variant)}
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={() => handleDeleteVariant(variant.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVariant ? "Edit Variant" : "Add Variant"}</DialogTitle>
            <DialogDescription>Configure variant attributes, pricing, and stock levels.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
                  placeholder="e.g., WHIT-M-RED"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Attributes *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddAttribute}>
                    <Plus className="size-3 mr-1" /> Add Attribute
                  </Button>
                </div>
                {Object.entries(formData.attributes).map(([key, value]) => (
                  <div key={key} className="flex gap-2 items-center">
                    <Input
                      value={key}
                      onChange={(e) => {
                        const newAttributes = { ...formData.attributes };
                        delete newAttributes[key];
                        newAttributes[e.target.value] = value;
                        setFormData((prev) => ({ ...prev, attributes: newAttributes }));
                      }}
                      placeholder="Attribute name"
                      className="flex-1"
                    />
                    <Input
                      value={value}
                      onChange={(e) => handleAttributeChange(key, e.target.value)}
                      placeholder="Value"
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAttribute(key)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {Object.keys(formData.attributes).length === 0 && (
                  <p className="text-xs text-muted-foreground">No attributes added yet</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="price_override">Price Override (£)</Label>
                <Input
                  id="price_override"
                  type="number"
                  step="0.01"
                  value={formData.price_override}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price_override: e.target.value }))}
                  placeholder="Leave empty to use base price"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="stock_qty">Stock Quantity</Label>
                <Input
                  id="stock_qty"
                  type="number"
                  value={formData.stock_qty}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stock_qty: e.target.value }))}
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

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingVariant ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
