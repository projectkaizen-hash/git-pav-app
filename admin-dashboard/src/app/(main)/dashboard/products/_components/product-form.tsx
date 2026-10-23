"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ArrowLeft, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ProductData {
  id?: string;
  name: string;
  slug: string;
  category_id?: string;
  price: string | number;
  original_price?: string | number;
  short_desc?: string;
  full_desc?: string;
  features?: string[];
  how_to_use?: string;
  badge?: string;
  in_stock?: boolean;
  published?: boolean;
  image?: string;
}

export function ProductForm({ initialData }: { initialData?: ProductData }) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [categoryId, setCategoryId] = useState(initialData?.category_id || "");
  const [price, setPrice] = useState(initialData?.price?.toString() || "49.99");
  const [originalPrice, setOriginalPrice] = useState(initialData?.original_price?.toString() || "");
  const [shortDesc, setShortDesc] = useState(initialData?.short_desc || "");
  const [fullDesc, setFullDesc] = useState(initialData?.full_desc || "");
  const [features, setFeatures] = useState<string[]>(
    Array.isArray(initialData?.features) && initialData.features.length > 0 ? initialData.features : [""],
  );
  const [howToUse, setHowToUse] = useState(initialData?.how_to_use || "");
  const [badge, setBadge] = useState(initialData?.badge || "");
  const [inStock, setInStock] = useState(initialData?.in_stock ?? true);
  const [published, setPublished] = useState(initialData?.published ?? true);
  const [imageUrl, setImageUrl] = useState(initialData?.image || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Variant state
  const [variants, setVariants] = useState<any[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [newSku, setNewSku] = useState("");
  const [newAttrKey, setNewAttrKey] = useState("Option");
  const [newAttrValue, setNewAttrValue] = useState("");
  const [newPriceOverride, setNewPriceOverride] = useState("");
  const [newStockQty, setNewStockQty] = useState("50");
  const [savingVariant, setSavingVariant] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (isEditing && initialData?.id) {
      fetchVariants();
    }
  }, [isEditing, initialData?.id]);

  const fetchVariants = async () => {
    if (!initialData?.id) return;
    setLoadingVariants(true);
    try {
      const res = await fetch(`/api/v1/admin/products/${initialData.id}/variants`);
      if (res.ok) {
        const data = await res.json();
        setVariants(data);
      }
    } catch {
      toast.error("Failed to load variants");
    } finally {
      setLoadingVariants(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/v1/admin/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast.error("Failed to load categories");
    }
  };

  function handleNameChange(val: string) {
    setName(val);
    if (!isEditing) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, ""),
      );
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/admin/products/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setImageUrl(data.url);
      toast.success("Image uploaded successfully");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!initialData?.id || !newSku.trim()) {
      toast.error("SKU is required");
      return;
    }
    setSavingVariant(true);
    try {
      const attributes: Record<string, string> = {};
      if (newAttrValue.trim()) {
        attributes[newAttrKey.trim() || "Option"] = newAttrValue.trim();
      } else {
        attributes["Standard"] = "Default";
      }

      const res = await fetch(`/api/v1/admin/products/${initialData.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: newSku.trim().toUpperCase(),
          attributes,
          price_override: newPriceOverride ? parseFloat(newPriceOverride) : null,
          stock_qty: parseInt(newStockQty) || 0,
          is_active: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create variant");
      }

      toast.success("Variant created");
      setNewSku("");
      setNewAttrValue("");
      setNewPriceOverride("");
      setShowAddVariant(false);
      fetchVariants();
    } catch (err: any) {
      toast.error(err.message || "Failed to create variant");
    } finally {
      setSavingVariant(false);
    }
  }

  async function handleUpdateVariantStock(variantId: string, stock_qty: number) {
    try {
      const res = await fetch(`/api/v1/admin/products/${initialData?.id}/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_qty }),
      });
      if (!res.ok) throw new Error("Failed to update stock");
      toast.success("Stock updated");
      fetchVariants();
    } catch {
      toast.error("Failed to update stock");
    }
  }

  async function handleToggleVariantActive(variantId: string, is_active: boolean) {
    try {
      const res = await fetch(`/api/v1/admin/products/${initialData?.id}/variants/${variantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      if (!res.ok) throw new Error("Failed to update variant status");
      toast.success(is_active ? "Variant activated" : "Variant deactivated");
      fetchVariants();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDeleteVariant(variantId: string) {
    if (!confirm("Are you sure you want to delete this variant?")) return;
    try {
      const res = await fetch(`/api/v1/admin/products/${initialData?.id}/variants/${variantId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete variant");
      }
      toast.success("Variant deleted");
      fetchVariants();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete variant");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !slug || !price) {
      toast.error("Please fill in required fields: Name, Slug, Price");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        slug,
        category_id: categoryId || null,
        price: parseFloat(price) || 0,
        original_price: originalPrice ? parseFloat(originalPrice) : null,
        short_desc: shortDesc,
        full_desc: fullDesc,
        features: features.filter((f) => f.trim() !== ""),
        how_to_use: howToUse,
        badge: badge || null,
        in_stock: inStock,
        published,
        image_url: imageUrl,
      };

      const url = isEditing ? `/api/v1/admin/products/${initialData.id}` : "/api/v1/admin/products";

      const res = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");
      toast.success(isEditing ? "Product updated!" : "Product created!");
      router.push("/dashboard/products");
    } catch {
      toast.error("Error saving product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {!isEditing && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard/products">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">New Product</h1>
              <p className="text-sm text-muted-foreground">
                Configure product details, stock, pricing, and showcase images.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/products">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Product"}
            </Button>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/products">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Main Info */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold">Product Name *</label>
                  <Input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. PavPro™ Clinical Teeth Whitening System"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">URL Slug *</label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g. pav-whitening-system"
                    className="mt-1 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">Category</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold">Short Summary</label>
                <Textarea
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  placeholder="Brief 1-2 sentence description shown in catalog cards..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Full Description</label>
                <Textarea
                  value={fullDesc}
                  onChange={(e) => setFullDesc(e.target.value)}
                  placeholder="Detailed breakdown of ingredients, mechanism, clinical safety..."
                  className="mt-1"
                  rows={4}
                />
              </div>

              <div>
                <label className="text-xs font-semibold">How to Use</label>
                <Textarea
                  value={howToUse}
                  onChange={(e) => setHowToUse(e.target.value)}
                  placeholder="Daily application instructions for patients..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Features / Highlights</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setFeatures([...features, ""])}>
                <Plus className="size-3.5 mr-1" /> Add Feature
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((feat, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={feat}
                    onChange={(e) => {
                      const copy = [...features];
                      copy[idx] = e.target.value;
                      setFeatures(copy);
                    }}
                    placeholder={`Feature #${idx + 1}`}
                  />
                  {features.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setFeatures(features.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Variants & Stock Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Product Variants & Stock</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Manage SKUs, attributes (shades, sizes, packs), price overrides, and stock levels.
                </p>
              </div>
              {isEditing && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddVariant(!showAddVariant)}>
                  <Plus className="size-3.5 mr-1" />
                  {showAddVariant ? "Cancel" : "Add Variant"}
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEditing ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Save this product first to configure individual variants, SKUs, and stock tracking.
                </div>
              ) : (
                <>
                  {showAddVariant && (
                    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                      <p className="text-xs font-semibold">New Variant Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">SKU *</label>
                          <Input
                            placeholder="e.g. PAV-WHT-50ML"
                            value={newSku}
                            onChange={(e) => setNewSku(e.target.value)}
                            className="h-8 text-xs font-mono uppercase"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Option Name</label>
                            <Input
                              placeholder="e.g. Size, Shade"
                              value={newAttrKey}
                              onChange={(e) => setNewAttrKey(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Option Value</label>
                            <Input
                              placeholder="e.g. 50ml, Mint"
                              value={newAttrValue}
                              onChange={(e) => setNewAttrValue(e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">Price Override (£)</label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Leave empty to use base price"
                            value={newPriceOverride}
                            onChange={(e) => setNewPriceOverride(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground">Initial Stock Qty</label>
                          <Input
                            type="number"
                            value={newStockQty}
                            onChange={(e) => setNewStockQty(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowAddVariant(false)}>
                          Cancel
                        </Button>
                        <Button type="button" size="sm" disabled={savingVariant} onClick={handleAddVariant}>
                          {savingVariant ? "Saving..." : "Save Variant"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {loadingVariants ? (
                    <p className="text-xs text-muted-foreground py-2">Loading variants...</p>
                  ) : variants.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      No variants configured yet. This product operates on simple base inventory.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 border-b">
                          <tr>
                            <th className="p-2.5 font-semibold">SKU</th>
                            <th className="p-2.5 font-semibold">Attributes</th>
                            <th className="p-2.5 font-semibold">Price (£)</th>
                            <th className="p-2.5 font-semibold">Stock Qty</th>
                            <th className="p-2.5 font-semibold">Active</th>
                            <th className="p-2.5 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {variants.map((v) => (
                            <tr key={v.id} className="hover:bg-muted/20">
                              <td className="p-2.5 font-mono font-medium">{v.sku}</td>
                              <td className="p-2.5">
                                {v.attributes && typeof v.attributes === "object" ? (
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(v.attributes).map(([k, val]) => (
                                      <span
                                        key={k}
                                        className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                                      >
                                        {k}: {String(val)}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="p-2.5">
                                {v.price_override ? `£${parseFloat(v.price_override).toFixed(2)}` : "Base"}
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="number"
                                  defaultValue={v.stock_qty}
                                  onBlur={(e) => {
                                    const nextQty = parseInt(e.target.value) || 0;
                                    if (nextQty !== v.stock_qty) {
                                      handleUpdateVariantStock(v.id, nextQty);
                                    }
                                  }}
                                  className="w-16 rounded border px-1.5 py-0.5 text-xs text-center"
                                />
                              </td>
                              <td className="p-2.5">
                                <Switch
                                  checked={v.is_active}
                                  onCheckedChange={(checked) => handleToggleVariantActive(v.id, checked)}
                                />
                              </td>
                              <td className="p-2.5 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => handleDeleteVariant(v.id)}
                                >
                                  <Trash2 className="size-3.5 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Pricing & Publishing */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing & Badge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold">Price (£) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="49.99"
                  className="mt-1 font-semibold"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Original / Strikethrough Price (£)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="65.00"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Promotional Badge</label>
                <Input
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. Bestseller, New, 20% OFF"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Primary Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {imageUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Product preview" className="object-cover w-full h-full" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setImageUrl("")}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="border border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition">
                  <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">Upload product photo or paste URL below</p>
                  <label>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                    <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
                      <span>{uploading ? "Uploading..." : "Select File"}</span>
                    </Button>
                  </label>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold">Or Image URL</label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1 text-xs"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibility & Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Published</p>
                  <p className="text-xs text-muted-foreground">Visible on dental store</p>
                </div>
                <Switch checked={published} onCheckedChange={setPublished} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">In Stock</p>
                  <p className="text-xs text-muted-foreground">Available for purchase</p>
                </div>
                <Switch checked={inStock} onCheckedChange={setInStock} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
