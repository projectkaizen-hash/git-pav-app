"use client";

import { type ChangeEvent, type ReactNode, useCallback, useEffect, useState } from "react";

import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type DentistForm,
  type DentistProfile,
  MAX_PHOTO_BYTES,
  moveId,
  profilePayload,
  sortForWebsite,
  toForm,
} from "@/lib/pav-dentists";
import { appRequest } from "@/lib/pav-schedule";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function DentistCard({
  dentist,
  position,
  count,
  onSaved,
  onMove,
}: {
  dentist: DentistProfile;
  position: number;
  count: number;
  onSaved: () => Promise<void>;
  onMove: (by: -1 | 1) => void;
}) {
  const [form, setForm] = useState<DentistForm>(() => toForm(dentist));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<DentistForm>) => setForm((f) => ({ ...f, ...patch }));
  const id = (name: string) => `${dentist.id}-${name}`;

  useEffect(() => setForm(toForm(dentist)), [dentist]);

  async function uploadPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) return toast.error("Choose a photo under 1 MB");
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const res = await fetch("/api/v1/admin/blogs/upload-image", { method: "POST", body: data });
      if (!res.ok) throw new Error();
      set({ photoUrl: ((await res.json()) as { url: string }).url });
      toast.success("Photo added. Save to publish it.");
    } catch {
      toast.error("The photo didn't upload. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const result = profilePayload(form);
    if (!result.ok) return toast.error(result.error);
    setSaving(true);
    try {
      await appRequest(`clinicians/${dentist.id}/profile`, { method: "PATCH", body: JSON.stringify(result.payload) });
      toast.success(`${result.payload.fullName} saved`);
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            {dentist.fullName}
            {dentist.showOnWebsite ? <Badge>On website</Badge> : <Badge variant="outline">App only</Badge>}
          </CardTitle>
          <CardDescription>GDC {dentist.gdcNumber}</CardDescription>
        </div>
        {dentist.showOnWebsite ? (
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="outline"
              aria-label="Move up"
              disabled={position === 0}
              onClick={() => onMove(-1)}
            >
              <ArrowUp />
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label="Move down"
              disabled={position === count - 1}
              onClick={() => onMove(1)}
            >
              <ArrowDown />
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[160px_1fr]">
        <div className="flex flex-col items-start gap-2">
          {form.photoUrl ? (
            // biome-ignore lint/performance/noImgElement: staff-supplied photo from any host or a data URI
            <img src={form.photoUrl} alt={form.fullName} className="aspect-[4/5] w-40 rounded-md border object-cover" />
          ) : (
            <div className="flex aspect-[4/5] w-40 items-center justify-center rounded-md border border-dashed text-muted-foreground text-xs">
              No photo yet
            </div>
          )}
          <Label htmlFor={id("photo")} className="cursor-pointer text-primary text-sm">
            {uploading ? "Uploading…" : "Upload photo"}
          </Label>
          <input
            id={id("photo")}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={uploadPhoto}
          />
          {form.photoUrl ? (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => set({ photoUrl: "" })}>
              Remove photo
            </Button>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={id("name")} label="Name">
            <Input id={id("name")} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
          </Field>
          <Field id={id("role")} label="Role">
            <Input id={id("role")} value={form.roleTitle} onChange={(e) => set({ roleTitle: e.target.value })} />
          </Field>
          <Field id={id("gdc")} label="GDC number">
            <Input
              id={id("gdc")}
              inputMode="numeric"
              value={form.gdcNumber}
              onChange={(e) => set({ gdcNumber: e.target.value })}
            />
          </Field>
          <Field id={id("specialisms")} label="Specialisms (comma separated)">
            <Input
              id={id("specialisms")}
              value={form.specialisms}
              onChange={(e) => set({ specialisms: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id={id("bio")} label="Bio">
              <Textarea id={id("bio")} rows={5} value={form.bio} onChange={(e) => set({ bio: e.target.value })} />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-4 sm:col-span-2">
            <div className="flex items-center gap-2">
              <Switch
                id={id("website")}
                checked={form.showOnWebsite}
                onCheckedChange={(checked) => set({ showOnWebsite: checked })}
              />
              <Label htmlFor={id("website")}>Show on the website's team page</Label>
            </div>
            <Button onClick={save} disabled={saving || uploading}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DentistProfiles() {
  const [dentists, setDentists] = useState<DentistProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setDentists(sortForWebsite(await appRequest<DentistProfile[]>("clinicians")));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load the dentists");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = dentists.filter((d) => d.showOnWebsite);

  async function move(index: number, by: -1 | 1) {
    const ids = moveId(
      shown.map((d) => d.id),
      index,
      by,
    );
    if (!ids) return;
    try {
      await appRequest("clinicians/website-order", { method: "PUT", body: JSON.stringify({ clinicianIds: ids }) });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (loadError) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-destructive text-sm">{loadError}</p>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }
  if (dentists.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No clinicians yet. Add them on the Team & Services page first, then come back to write their profile.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {dentists.map((d) => (
        <DentistCard
          key={d.id}
          dentist={d}
          position={shown.indexOf(d)}
          count={shown.length}
          onSaved={load}
          onMove={(by) => void move(shown.indexOf(d), by)}
        />
      ))}
    </div>
  );
}
