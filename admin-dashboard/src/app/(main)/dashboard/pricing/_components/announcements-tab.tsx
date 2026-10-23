"use client";

import { useCallback, useEffect, useState } from "react";

import { Edit3, Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Announcement {
  id: string;
  title: string | null;
  body: string;
  cta_text: string | null;
  cta_url: string | null;
  is_active: boolean;
}

export function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/pricing/announcements");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAnnouncements(data);
    } catch {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  function openCreate() {
    setEditingItem(null);
    setTitle("");
    setBody("");
    setCtaText("Book Now");
    setCtaUrl("/booking");
    setIsActive(true);
    setDialogOpen(true);
  }

  function openEdit(item: Announcement) {
    setEditingItem(item);
    setTitle(item.title || "");
    setBody(item.body);
    setCtaText(item.cta_text || "");
    setCtaUrl(item.cta_url || "");
    setIsActive(item.is_active);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!body) {
      toast.error("Please enter announcement body");
      return;
    }

    try {
      const payload = { title, body, cta_text: ctaText, cta_url: ctaUrl, is_active: isActive };
      const url = editingItem
        ? `/api/v1/admin/pricing/announcements/${editingItem.id}`
        : "/api/v1/admin/pricing/announcements";

      const res = await fetch(url, {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Save failed");
      toast.success(editingItem ? "Announcement updated" : "Announcement created");
      setDialogOpen(false);
      fetchAnnouncements();
    } catch {
      toast.error("Failed to save announcement");
    }
  }

  async function toggleActive(item: Announcement) {
    try {
      const res = await fetch(`/api/v1/admin/pricing/announcements/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(`Announcement ${!item.is_active ? "activated" : "deactivated"}`);
      fetchAnnouncements();
    } catch {
      toast.error("Failed to toggle status");
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(`/api/v1/admin/pricing/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Announcement deleted");
      fetchAnnouncements();
    } catch {
      toast.error("Failed to delete announcement");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Promotional Banners & Announcements</h2>
          <p className="text-sm text-muted-foreground">
            Control the announcement banner shown on the pricing page and across the dental website.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="size-4 mr-1.5" /> New Announcement
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Megaphone className="size-8 mx-auto mb-2 text-muted-foreground/50" />
          No announcements created yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((item) => (
            <Card key={item.id} className={item.is_active ? "border-primary/50 shadow-xs" : "opacity-75"}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{item.title || "Announcement"}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{item.is_active ? "Active" : "Disabled"}</span>
                  <Switch checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{item.body}</p>
                {item.cta_text && (
                  <div className="text-xs text-primary font-semibold">
                    CTA Button: {item.cta_text} ({item.cta_url || "#"})
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                    <Edit3 className="size-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteItem(item.id)}>
                    <Trash2 className="size-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-semibold">Headline (Optional)</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Autumn Smile Special"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Message Text *</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="e.g. Book a consultation this month and receive 15% off whitening..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold">Button Label</label>
                <Input
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="Book Appointment"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Button Link URL</label>
                <Input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="/booking"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold">Display Active on Website</span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
