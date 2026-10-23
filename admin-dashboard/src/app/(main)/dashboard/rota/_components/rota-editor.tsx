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
import {
  appRequest,
  type Clinic,
  type Clinician,
  type OutsideHoursVisit,
  type RotaOverride,
  todayInUk,
  toMinute,
  toTime,
  ukDate,
  WEEK,
  WEEKDAY_NAMES,
} from "@/lib/pav-schedule";

interface BlockRow {
  key: number;
  weekday: number;
  start: string;
  end: string;
  clinicId: string;
}

// "" in a clinic picker means any clinic, or video only for a video clinician.
const ANY_CLINIC = "";

let nextKey = 0;
const toBlockRows = (clinician: Clinician): BlockRow[] =>
  clinician.rota.map((b) => ({
    key: nextKey++,
    weekday: b.weekday,
    start: toTime(b.startMinute),
    end: toTime(b.endMinute),
    clinicId: b.clinicId ?? ANY_CLINIC,
  }));

const weekOrder = (weekday: number) => WEEK.indexOf(weekday as (typeof WEEK)[number]);

export function RotaEditor() {
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [clinicianId, setClinicianId] = useState("");
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [overrides, setOverrides] = useState<RotaOverride[]>([]);
  const [outsideHours, setOutsideHours] = useState<OutsideHoursVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [changeDate, setChangeDate] = useState("");
  const [changeWorking, setChangeWorking] = useState(false);
  const [changeStart, setChangeStart] = useState("09:00");
  const [changeEnd, setChangeEnd] = useState("17:30");
  const [changeClinicId, setChangeClinicId] = useState(ANY_CLINIC);
  const [changeReason, setChangeReason] = useState("");

  const clinicName = (id: string | null) => clinics.find((c) => c.id === id)?.name ?? "Any clinic";

  const loadOverrides = useCallback(async (id: string) => {
    try {
      setOverrides(await appRequest<RotaOverride[]>(`clinicians/${id}/overrides?from=${todayInUk()}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load date changes");
    }
  }, []);

  const load = useCallback(
    async (keepClinicianId?: string) => {
      setLoading(true);
      try {
        const [clinicianData, clinicData] = await Promise.all([
          appRequest<Clinician[]>("clinicians"),
          appRequest<Clinic[]>("clinics"),
        ]);
        setClinicians(clinicianData);
        setClinics(clinicData);
        const selected = clinicianData.find((c) => c.id === keepClinicianId) ?? clinicianData[0];
        setClinicianId(selected?.id ?? "");
        setBlocks(selected ? toBlockRows(selected) : []);
        if (selected) await loadOverrides(selected.id);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load the rota");
      } finally {
        setLoading(false);
      }
    },
    [loadOverrides],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectClinician = (id: string) => {
    const next = clinicians.find((c) => c.id === id);
    setClinicianId(id);
    setOutsideHours([]);
    if (next) {
      setBlocks(toBlockRows(next));
      void loadOverrides(id);
    }
  };

  const setBlock = (key: number, change: Partial<BlockRow>) =>
    setBlocks((current) => current.map((b) => (b.key === key ? { ...b, ...change } : b)));

  const addBlock = () =>
    setBlocks((current) => [
      ...current,
      { key: nextKey++, weekday: 1, start: "09:00", end: "17:30", clinicId: ANY_CLINIC },
    ]);

  const saveRota = async () => {
    const payload = blocks.map((b) => ({
      weekday: b.weekday,
      startMinute: toMinute(b.start),
      endMinute: toMinute(b.end),
      clinicId: b.clinicId || null,
    }));
    const bad = payload.find((b) => b.endMinute <= b.startMinute);
    if (bad) {
      toast.error(`${WEEKDAY_NAMES[bad.weekday]}: the end time must be after the start time`);
      return;
    }
    const sorted = [...payload].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
    const overlap = sorted.find(
      (b, i) => i > 0 && sorted[i - 1].weekday === b.weekday && sorted[i - 1].endMinute > b.startMinute,
    );
    if (overlap) {
      toast.error(`${WEEKDAY_NAMES[overlap.weekday]}: two shifts overlap`);
      return;
    }
    setSaving(true);
    try {
      const result = await appRequest<{ outsideHours: OutsideHoursVisit[] }>(`clinicians/${clinicianId}/rota`, {
        method: "PUT",
        body: JSON.stringify({ blocks: payload }),
      });
      setOutsideHours(result.outsideHours);
      toast.success("Rota saved");
      await load(clinicianId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save the rota");
    } finally {
      setSaving(false);
    }
  };

  const saveChange = async () => {
    if (!changeDate) return;
    const reason = changeReason.trim() ? { reason: changeReason.trim() } : {};
    const body = changeWorking
      ? {
          working: true,
          startMinute: toMinute(changeStart),
          endMinute: toMinute(changeEnd),
          clinicId: changeClinicId || null,
          ...reason,
        }
      : { working: false, ...reason };
    if (changeWorking && toMinute(changeEnd) <= toMinute(changeStart)) {
      toast.error("The end time must be after the start time");
      return;
    }
    try {
      const result = await appRequest<{ outsideHours: OutsideHoursVisit[] }>(
        `clinicians/${clinicianId}/overrides/${changeDate}`,
        { method: "PUT", body: JSON.stringify(body) },
      );
      setOutsideHours(result.outsideHours);
      setChangeDate("");
      setChangeReason("");
      toast.success("Date change saved");
      await loadOverrides(clinicianId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save the date change");
    }
  };

  const removeChange = async (date: string) => {
    try {
      await appRequest(`clinicians/${clinicianId}/overrides/${date}`, { method: "DELETE" });
      toast.success("Date change removed");
      await loadOverrides(clinicianId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove the date change");
    }
  };

  if (loading && clinicians.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading the rota...</div>
      </div>
    );
  }

  if (!clinicianId) {
    return <div className="text-muted-foreground">No clinicians yet.</div>;
  }

  const clinicOptions = (
    <>
      <NativeSelectOption value={ANY_CLINIC}>Any clinic / video</NativeSelectOption>
      {clinics.map((c) => (
        <NativeSelectOption key={c.id} value={c.id}>
          {c.name}
        </NativeSelectOption>
      ))}
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="clinician">Clinician</Label>
        <NativeSelect id="clinician" value={clinicianId} onChange={(e) => selectClinician(e.target.value)}>
          {clinicians.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.fullName}
              {c.roleTitle ? `, ${c.roleTitle}` : ""}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <OutsideHoursAlert visits={outsideHours} />

      <Card>
        <CardHeader>
          <CardTitle>Weekly rota</CardTitle>
          <CardDescription>
            The shifts this clinician works every week. A day with no shift is a day off. Clinic visits also need the
            clinic to be open.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {blocks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No shifts. Patients can't book this clinician.</p>
          ) : null}
          {[...blocks]
            .sort((a, b) => weekOrder(a.weekday) - weekOrder(b.weekday) || a.start.localeCompare(b.start))
            .map((block) => (
              <div key={block.key} className="flex flex-wrap items-center gap-2">
                <NativeSelect
                  aria-label="Day"
                  value={String(block.weekday)}
                  onChange={(e) => setBlock(block.key, { weekday: Number(e.target.value) })}
                >
                  {WEEK.map((weekday) => (
                    <NativeSelectOption key={weekday} value={String(weekday)}>
                      {WEEKDAY_NAMES[weekday]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <Input
                  type="time"
                  step={300}
                  className="w-32"
                  aria-label="Starts"
                  value={block.start}
                  onChange={(e) => setBlock(block.key, { start: e.target.value })}
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="time"
                  step={300}
                  className="w-32"
                  aria-label="Ends"
                  value={block.end}
                  onChange={(e) => setBlock(block.key, { end: e.target.value })}
                />
                <NativeSelect
                  aria-label="Clinic"
                  value={block.clinicId}
                  onChange={(e) => setBlock(block.key, { clinicId: e.target.value })}
                >
                  {clinicOptions}
                </NativeSelect>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove shift"
                  onClick={() => setBlocks((current) => current.filter((b) => b.key !== block.key))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={addBlock}>
              <Plus className="size-4" /> Add shift
            </Button>
            <Button onClick={saveRota} disabled={saving}>
              {saving ? "Saving..." : "Save weekly rota"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date changes</CardTitle>
          <CardDescription>
            Leave, sickness or a different shift on one date. A date change replaces the weekly rota for that day.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="change-date">Date</Label>
              <Input
                id="change-date"
                type="date"
                min={todayInUk()}
                className="w-44"
                value={changeDate}
                onChange={(e) => setChangeDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="change-kind">Change</Label>
              <NativeSelect
                id="change-kind"
                value={changeWorking ? "working" : "off"}
                onChange={(e) => setChangeWorking(e.target.value === "working")}
              >
                <NativeSelectOption value="off">Not working</NativeSelectOption>
                <NativeSelectOption value="working">Different hours</NativeSelectOption>
              </NativeSelect>
            </div>
            {changeWorking ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="change-start">Starts</Label>
                  <Input
                    id="change-start"
                    type="time"
                    step={300}
                    className="w-32"
                    value={changeStart}
                    onChange={(e) => setChangeStart(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="change-end">Ends</Label>
                  <Input
                    id="change-end"
                    type="time"
                    step={300}
                    className="w-32"
                    value={changeEnd}
                    onChange={(e) => setChangeEnd(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="change-clinic">Clinic</Label>
                  <NativeSelect
                    id="change-clinic"
                    value={changeClinicId}
                    onChange={(e) => setChangeClinicId(e.target.value)}
                  >
                    {clinicOptions}
                  </NativeSelect>
                </div>
              </>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="change-reason">Note (optional)</Label>
              <Input
                id="change-reason"
                maxLength={200}
                className="w-56"
                placeholder="e.g. Annual leave"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={saveChange} disabled={!changeDate}>
              <Plus className="size-4" /> Save date change
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Keep notes short and non-medical, for example "Annual leave" rather than a reason for sickness.
          </p>

          {overrides.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming date changes.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {overrides.map((o) => (
                <li key={o.date} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>
                    {ukDate(o.date)} ·{" "}
                    {o.working && o.startMinute !== null && o.endMinute !== null
                      ? `${toTime(o.startMinute)} to ${toTime(o.endMinute)}, ${clinicName(o.clinicId)}`
                      : "Not working"}
                    {o.reason ? <span className="text-muted-foreground"> · {o.reason}</span> : null}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${o.date}`}
                    onClick={() => removeChange(o.date)}
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
