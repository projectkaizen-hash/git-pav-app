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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const discountSchema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Code must be less than 50 characters"),
  type: z.enum(["percentage", "fixed_amount"]),
  value: z.string().min(1, "Value is required"),
  min_order_value: z.string().optional(),
  max_uses: z.string().optional(),
  valid_from: z.string().min(1, "Valid from is required"),
  valid_until: z.string().optional(),
  is_active: z.boolean().optional(),
});

type DiscountFormData = z.infer<typeof discountSchema>;

interface DiscountFormProps {
  discountId?: string;
  initialData?: Partial<DiscountFormData>;
}

export function DiscountForm({ discountId, initialData }: DiscountFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: initialData || {
      code: "",
      type: "percentage",
      value: "",
      min_order_value: "",
      max_uses: "",
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        if (value !== undefined) {
          form.setValue(key as keyof DiscountFormData, value as any);
        }
      });
    }
  }, [initialData, form]);

  const onSubmit = async (data: DiscountFormData) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        value: parseFloat(data.value),
        min_order_value: data.min_order_value ? parseFloat(data.min_order_value) : null,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        valid_from: new Date(data.valid_from).toISOString(),
        valid_until: data.valid_until ? new Date(data.valid_until).toISOString() : null,
      };

      const url = discountId ? `/api/v1/admin/discounts/${discountId}` : "/api/v1/admin/discounts";
      const method = discountId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save discount");

      toast.success(discountId ? "Discount updated" : "Discount created");
      router.push("/dashboard/discounts");
    } catch {
      toast.error("Failed to save discount");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{discountId ? "Edit Discount" : "Create Discount"}</CardTitle>
        <CardDescription>{discountId ? "Update discount details" : "Create a new discount code"}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" placeholder="SUMMER2024" {...form.register("code")} className="uppercase" />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) => form.setValue("type", value as "percentage" | "fixed_amount")}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">{form.watch("type") === "percentage" ? "Percentage (%)" : "Amount (£)"}</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                placeholder={form.watch("type") === "percentage" ? "10" : "5.00"}
                {...form.register("value")}
              />
              {form.formState.errors.value && (
                <p className="text-sm text-destructive">{form.formState.errors.value.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_order_value">Minimum Order Value (£)</Label>
              <Input
                id="min_order_value"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("min_order_value")}
              />
              {form.formState.errors.min_order_value && (
                <p className="text-sm text-destructive">{form.formState.errors.min_order_value.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_uses">Maximum Uses</Label>
            <Input id="max_uses" type="number" placeholder="Leave empty for unlimited" {...form.register("max_uses")} />
            {form.formState.errors.max_uses && (
              <p className="text-sm text-destructive">{form.formState.errors.max_uses.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valid_from">Valid From</Label>
              <Input id="valid_from" type="date" {...form.register("valid_from")} />
              {form.formState.errors.valid_from && (
                <p className="text-sm text-destructive">{form.formState.errors.valid_from.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valid_until">Valid Until</Label>
              <Input id="valid_until" type="date" {...form.register("valid_until")} />
              {form.formState.errors.valid_until && (
                <p className="text-sm text-destructive">{form.formState.errors.valid_until.message}</p>
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
            <Button type="button" variant="outline" onClick={() => router.push("/dashboard/discounts")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : discountId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
