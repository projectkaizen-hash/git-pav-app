"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface Feature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  color: "bronze" | "silver" | "gold";
  monthly_price: number | string;
  yearly_price: number | string;
  features: Feature[];
  is_popular: boolean;
  badge: string | null;
  sort_order: number;
}

export function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/pricing/plans");
      if (!res.ok) throw new Error("Failed to fetch plans");
      const data = await res.json();
      setPlans(data);
    } catch {
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  function openEdit(plan: Plan) {
    setEditingPlan(JSON.parse(JSON.stringify(plan)));
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editingPlan) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/pricing/plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingPlan.name,
          monthly_price: parseFloat(editingPlan.monthly_price as string),
          yearly_price: parseFloat(editingPlan.yearly_price as string),
          is_popular: editingPlan.is_popular,
          features: editingPlan.features,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      toast.success("Plan updated successfully");
      setDialogOpen(false);
      fetchPlans();
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  }

  const BANNER_BG: Record<string, string> = {
    bronze: "bg-[#c4824d]",
    silver: "bg-[#95a5a6]",
    gold: "bg-[#d4af37]",
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Membership Tier Plans</h2>
          <p className="text-sm text-muted-foreground">
            Edit monthly & yearly pricing, feature inclusions, and popularity tags shown on the pricing page.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative flex flex-col overflow-hidden border">
              <div className={`py-6 px-4 text-center text-white ${BANNER_BG[plan.color] || "bg-primary"}`}>
                <p className="text-xs uppercase tracking-widest font-bold opacity-90">{plan.name}</p>
                <p className="text-4xl font-extrabold mt-1">
                  £{parseFloat(plan.monthly_price as string).toFixed(2)}
                  <span className="text-xs font-normal opacity-80">/mo</span>
                </p>
                <p className="text-xs opacity-85 mt-0.5">
                  Annual: £{parseFloat(plan.yearly_price as string).toFixed(2)}/mo
                </p>
              </div>

              <CardContent className="flex-1 p-5 flex flex-col justify-between gap-4">
                <ul className="space-y-2 text-xs">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {f.included ? (
                        <Check className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <X className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? "font-medium" : "text-muted-foreground"}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2 flex items-center justify-between border-t mt-auto">
                  {plan.is_popular ? (
                    <Badge variant="default" className="text-[10px]">
                      Popular Choice
                    </Badge>
                  ) : (
                    <span />
                  )}
                  <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                    <Edit3 className="size-3.5 mr-1.5" /> Edit Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Plan Dialog */}
      {editingPlan && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Plan: {editingPlan.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold">Plan Name</label>
                <Input
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Monthly Price (£)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingPlan.monthly_price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, monthly_price: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Yearly Rate (£/mo)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingPlan.yearly_price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, yearly_price: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-semibold">Highlight as Popular</p>
                  <p className="text-[11px] text-muted-foreground">Highlights card on website</p>
                </div>
                <Switch
                  checked={editingPlan.is_popular}
                  onCheckedChange={(val) => setEditingPlan({ ...editingPlan, is_popular: val })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold">Features Checklist</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      setEditingPlan({
                        ...editingPlan,
                        features: [...editingPlan.features, { text: "New benefit", included: true }],
                      })
                    }
                  >
                    <Plus className="size-3 mr-1" /> Add
                  </Button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {editingPlan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={f.included ? "default" : "outline"}
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => {
                          const copy = [...editingPlan.features];
                          copy[i].included = !copy[i].included;
                          setEditingPlan({ ...editingPlan, features: copy });
                        }}
                      >
                        {f.included ? <Check className="size-3.5" /> : <X className="size-3.5 text-rose-500" />}
                      </Button>
                      <Input
                        value={f.text}
                        onChange={(e) => {
                          const copy = [...editingPlan.features];
                          copy[i].text = e.target.value;
                          setEditingPlan({ ...editingPlan, features: copy });
                        }}
                        className="text-xs h-8"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive shrink-0"
                        onClick={() => {
                          setEditingPlan({
                            ...editingPlan,
                            features: editingPlan.features.filter((_, idx) => idx !== i),
                          });
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
