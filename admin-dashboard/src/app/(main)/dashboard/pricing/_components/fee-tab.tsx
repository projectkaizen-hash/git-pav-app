"use client";

import { useCallback, useEffect, useState } from "react";

import { Check, Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FeeItem {
  id: string;
  name: string;
  fee: string;
  sort_order: number;
}

interface FeeCategory {
  id: string;
  name: string;
  items: FeeItem[];
}

export function FeeTab() {
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; fee: string } | null>(null);
  const [newItemCatId, setNewItemCatId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemFee, setNewItemFee] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchFeeSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/pricing/fee");
      if (!res.ok) throw new Error("Failed to fetch fee schedule");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast.error("Failed to load fee schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeSchedule();
  }, [fetchFeeSchedule]);

  async function saveItemEdit() {
    if (!editingItem) return;
    try {
      const res = await fetch(`/api/v1/admin/pricing/fee/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingItem.name, fee: editingItem.fee }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Treatment fee updated");
      setEditingItem(null);
      fetchFeeSchedule();
    } catch {
      toast.error("Failed to update fee");
    }
  }

  async function createItem() {
    if (!newItemCatId || !newItemName || !newItemFee) {
      toast.error("Please fill treatment name and fee");
      return;
    }
    try {
      const res = await fetch("/api/v1/admin/pricing/fee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: newItemCatId, name: newItemName, fee: newItemFee }),
      });
      if (!res.ok) throw new Error("Create failed");
      toast.success("Treatment added");
      setDialogOpen(false);
      setNewItemName("");
      setNewItemFee("");
      setNewItemCatId(null);
      fetchFeeSchedule();
    } catch {
      toast.error("Failed to add treatment");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Are you sure you want to delete this treatment?")) return;
    try {
      const res = await fetch(`/api/v1/admin/pricing/fee/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Treatment removed");
      fetchFeeSchedule();
    } catch {
      toast.error("Failed to delete treatment");
    }
  }

  const filtered = categories
    .map((cat) => ({
      ...cat,
      items: (cat.items || []).filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          cat.name.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Treatment & Fee Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Edit clinical fees, consultation rates, and surgical procedure pricing.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search treatments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading fee schedule...</div>
      ) : (
        <div className="space-y-6">
          {filtered.map((cat) => (
            <div key={cat.id} className="rounded-xl border bg-card shadow-xs overflow-hidden">
              <div className="flex items-center justify-between bg-muted/50 px-4 py-2.5 border-b">
                <span className="font-semibold text-sm">{cat.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setNewItemCatId(cat.id);
                    setDialogOpen(true);
                  }}
                >
                  <Plus className="size-3 mr-1" /> Add Treatment
                </Button>
              </div>

              <Table>
                <TableBody>
                  {cat.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="w-2/3 py-2.5">
                        {editingItem?.id === item.id ? (
                          <Input
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <span className="font-medium text-sm">{item.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="w-1/4 py-2.5">
                        {editingItem?.id === item.id ? (
                          <Input
                            value={editingItem.fee}
                            onChange={(e) => setEditingItem({ ...editingItem, fee: e.target.value })}
                            className="h-8 text-sm font-semibold text-primary"
                          />
                        ) : (
                          <span className="font-bold text-sm text-primary">{item.fee}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2.5">
                        {editingItem?.id === item.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-emerald-600"
                              onClick={saveItemEdit}
                            >
                              <Check className="size-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingItem(null)}>
                              <X className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => setEditingItem({ id: item.id, name: item.name, fee: item.fee })}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Treatment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold">Treatment Name</label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g. Laser Gum Contouring"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Fee Text</label>
              <Input
                value={newItemFee}
                onChange={(e) => setNewItemFee(e.target.value)}
                placeholder="e.g. £150 or From £200"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createItem}>Add Treatment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
