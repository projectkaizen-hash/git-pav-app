"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const shippingSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().optional(),
  base_price: z.string().min(1, "Base price is required"),
  free_shipping_threshold: z.string().optional(),
  estimated_days: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.string().optional(),
});

type ShippingFormData = z.infer<typeof shippingSchema>;

interface ShippingFormProps {
  shippingId?: string;
  initialData?: Partial<ShippingFormData>;
}

export function ShippingForm({ shippingId, initialData }: ShippingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<ShippingFormData>({
    resolver: zodResolver(shippingSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      base_price: "",
      free_shipping_threshold: "",
      estimated_days: "",
      is_active: true,
      sort_order: "0",
    },
  });

  useEffect(() => {
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        if (value !== undefined) {
          form.setValue(key as keyof ShippingFormData, value as any);
        }
      });
    }
  }, [initialData, form]);

  const onSubmit = async (data: ShippingFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        base_price: parseFloat(data.base_price),
        free_shipping_threshold: data.free_shipping_threshold ? parseFloat(data.free_shipping_threshold) : null,
        estimated_days: data.estimated_days ? parseInt(data.estimated_days) : null,
        sort_order: data.sort_order ? parseInt(data.sort_order) : 0,
      };

      const url = shippingId ? `/api/v1/admin/shipping/${shippingId}` : "/api/v1/admin/shipping";
      const method = shippingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save shipping method");

      toast.success(shippingId ? "Shipping method updated" : "Shipping method created");
      router.push("/dashboard/shipping");
    } catch {
      toast.error("Failed to save shipping method");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{shippingId ? "Edit Shipping Method" : "Create Shipping Method"}</CardTitle>
        <CardDescription>
          {shippingId ? "Update shipping method details" : "Create a new shipping method"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Standard Shipping" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Standard delivery within 3-5 business days"
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price (£)</Label>
              <Input id="base_price" type="number" step="0.01" placeholder="4.99" {...form.register("base_price")} />
              {form.formState.errors.base_price && (
                <p className="text-sm text-destructive">{form.formState.errors.base_price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="free_shipping_threshold">Free Shipping Threshold (£)</Label>
              <Input
                id="free_shipping_threshold"
                type="number"
                step="0.01"
                placeholder="50.00"
                {...form.register("free_shipping_threshold")}
              />
              {form.formState.errors.free_shipping_threshold && (
                <p className="text-sm text-destructive">{form.formState.errors.free_shipping_threshold.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_days">Estimated Delivery Days</Label>
              <Input id="estimated_days" type="number" placeholder="3" {...form.register("estimated_days")} />
              {form.formState.errors.estimated_days && (
                <p className="text-sm text-destructive">{form.formState.errors.estimated_days.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input id="sort_order" type="number" placeholder="0" {...form.register("sort_order")} />
              {form.formState.errors.sort_order && (
                <p className="text-sm text-destructive">{form.formState.errors.sort_order.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={form.watch("is_active")}
              onCheckedChange={(checked) => form.setValue("is_active", checked)}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/shipping")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : shippingId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
