"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { OutsideHoursAlert } from "@/components/outside-hours-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  appRequest,
  type Clinic,
  type OutsideHoursVisit,
  todayInUk,
  toMinute,
  toTime,
  ukDate,
  WEEK,
  WEEKDAY_NAMES,
} from "@/lib/pav-schedule";

interface DayRow {
  open: boolean;
  opens: string;
  closes: string;
}

const toRows = (clinic: Clinic): Record<number, DayRow> =>
  Object.fromEntries(
    WEEK.map((weekday) => {
      const hours = clinic.openingHours.find((h) => h.weekday === weekday);
      return [
        weekday,
        hours
          ? { open: true, opens: toTime(hours.opensMinute), closes: toTime(hours.closesMinute) }
          : { open: false, opens: "09:00", closes: "17:30" },
      ];
    }),
  );

export function OpeningHoursEditor() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicId, setClinicId] = useState("");
  const [rows, setRows] = useState<Record<number, DayRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [outsideHours, setOutsideHours] = useState<OutsideHoursVisit[]>([]);
  const [closureDate, setClosureDate] = useState("");
  const [closureReason, setClosureReason] = useState("");

  const clinic = clinics.find((c) => c.id === clinicId);

  const load = useCallback(async (keepClinicId?: string) => {
    setLoading(true);
    try {
      const data = await appRequest<Clinic[]>("clinics");
      setClinics(data);
      const selected = data.find((c) => c.id === keepClinicId) ?? data[0];
      setClinicId(selected?.id ?? "");
      setRows(selected ? toRows(selected) : {});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load clinics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectClinic = (id: string) => {
    const next = clinics.find((c) => c.id === id);
    setClinicId(id);
    setOutsideHours([]);
    if (next) setRows(toRows(next));
  };

  const setRow = (weekday: number, change: Partial<DayRow>) =>
    setRows((current) => ({ ...current, [weekday]: { ...current[weekday], ...change } }));

  const saveHours = async () => {
    const hours = WEEK.filter((weekday) => rows[weekday]?.open).map((weekday) => ({
      weekday,
      opensMinute: toMinute(rows[weekday].opens),
      closesMinute: toMinute(rows[weekday].closes),
    }));
    const bad = hours.find((h) => h.closesMinute <= h.opensMinute);
    if (bad) {
      toast.error(`${WEEKDAY_NAMES[bad.weekday]}: closing time must be after opening time`);
      return;
    }
    setSaving(true);
    try {
      const result = await appRequest<{ outsideHours: OutsideHoursVisit[] }>(`clinics/${clinicId}/hours`, {
        method: "PUT",
        body: JSON.stringify({ hours }),
      });
      setOutsideHours(result.outsideHours);
      toast.success("Opening hours saved");
      await load(clinicId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save opening hours");
    } finally {
      setSaving(false);
    }
  };

  const addClosure = async () => {
    if (!closureDate) return;
    try {
      const result = await appRequest<{ outsideHours: OutsideHoursVisit[] }>(`clinics/${clinicId}/closures`, {
        method: "POST",
        body: JSON.stringify({ date: closureDate, ...(closureReason.trim() ? { reason: closureReason.trim() } : {}) }),
      });
      setOutsideHours(result.outsideHours);
      setClosureDate("");
      setClosureReason("");
      toast.success("Closed day added");
      await load(clinicId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add the closed day");
    }
  };

  const removeClosure = async (date: string) => {
    try {
      await appRequest(`clinics/${clinicId}/closures/${date}`, { method: "DELETE" });
      toast.success("Closed day removed");
      await load(clinicId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove the closed day");
    }
  };

  if (loading && clinics.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading clinics...</div>
      </div>
    );
  }

  if (!clinic) {
    return <div className="text-muted-foreground">No clinics yet. Clinics are added in the app's admin tools.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="clinic">Clinic</Label>
        <NativeSelect id="clinic" value={clinicId} onChange={(e) => selectClinic(e.target.value)}>
          {clinics.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
              {c.city ? `, ${c.city}` : ""}
              {c.isActive ? "" : " (inactive)"}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <OutsideHoursAlert visits={outsideHours} />

      <Card>
        <CardHeader>
          <CardTitle>Weekly hours</CardTitle>
          <CardDescription>Turn a day off to close the clinic every week on that day.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {WEEK.map((weekday) => {
            const row = rows[weekday];
            if (!row) return null;
            return (
              <div key={weekday} className="flex flex-wrap items-center gap-3">
                <div className="flex w-36 items-center gap-2">
                  <Switch
                    id={`open-${weekday}`}
                    checked={row.open}
                    onCheckedChange={(open) => setRow(weekday, { open })}
                  />
                  <Label htmlFor={`open-${weekday}`}>{WEEKDAY_NAMES[weekday]}</Label>
                </div>
                {row.open ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      step={300}
                      className="w-32"
                      aria-label={`${WEEKDAY_NAMES[weekday]} opens`}
                      value={row.opens}
                      onChange={(e) => setRow(weekday, { opens: e.target.value })}
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="time"
                      step={300}
                      className="w-32"
                      aria-label={`${WEEKDAY_NAMES[weekday]} closes`}
                      value={row.closes}
                      onChange={(e) => setRow(weekday, { closes: e.target.value })}
                    />
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Closed</span>
                )}
              </div>
            );
          })}
          <div>
            <Button onClick={saveHours} disabled={saving}>
              {saving ? "Saving..." : "Save weekly hours"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Closed days</CardTitle>
          <CardDescription>
            Bank holidays and other days the clinic is shut. No appointments are offered on these dates.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="closure-date">Date</Label>
              <Input
                id="closure-date"
                type="date"
                min={todayInUk()}
                className="w-44"
                value={closureDate}
                onChange={(e) => setClosureDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="closure-reason">Reason (optional)</Label>
              <Input
                id="closure-reason"
                maxLength={200}
                className="w-64"
                placeholder="e.g. Bank holiday"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={addClosure} disabled={!closureDate}>
              <Plus className="size-4" /> Add closed day
            </Button>
          </div>

          {clinic.closures.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming closed days.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {clinic.closures.map((closure) => (
                <li key={closure.date} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    {ukDate(closure.date)}
                    {closure.reason ? <span className="text-muted-foreground"> · {closure.reason}</span> : null}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${closure.date}`}
                    onClick={() => removeClosure(closure.date)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
