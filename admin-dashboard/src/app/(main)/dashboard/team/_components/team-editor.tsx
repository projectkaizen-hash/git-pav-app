"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { appRequest } from "@/lib/pav-schedule";
import {
  CHANNELS,
  type Channel,
  clinicPayload,
  clinicianPayload,
  formatPounds,
  operatorPayload,
  SERVICE_CATEGORIES,
  type ServiceCategory,
  type StaffCreated,
  servicePayload,
  type TeamClinic,
  type TeamClinician,
  type TeamService,
  type TeamVan,
  vanPayload,
} from "@/lib/pav-team";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

const inviteMessage = (created: StaffCreated) =>
  created.inviteSent
    ? `${created.fullName} added. We've emailed ${created.email} a link to set their password.`
    : `${created.fullName} added, but the invite email didn't send. They can use "Forgot password" in the app.`;

export function TeamEditor() {
  const [clinicians, setClinicians] = useState<TeamClinician[]>([]);
  const [services, setServices] = useState<TeamService[]>([]);
  const [vans, setVans] = useState<TeamVan[]>([]);
  const [clinics, setClinics] = useState<TeamClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [clinician, setClinician] = useState({
    email: "",
    fullName: "",
    gdcNumber: "",
    roleTitle: "Dentist",
    isTelehealthActive: true,
  });
  const [operator, setOperator] = useState({ email: "", fullName: "", phone: "" });
  const [service, setService] = useState({
    name: "",
    category: "checkup" as ServiceCategory,
    durationMinutes: "30",
    price: "",
    deposit: "",
    channels: ["clinic"] as Channel[],
  });
  const [van, setVan] = useState({ name: "", registrationPlate: "", vehicleModel: "" });
  const [clinic, setClinic] = useState({ name: "", address: "", postcode: "", city: "", phone: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [clinicianData, serviceData, vanData, clinicData] = await Promise.all([
        appRequest<TeamClinician[]>("clinicians"),
        appRequest<TeamService[]>("services"),
        appRequest<TeamVan[]>("vans"),
        appRequest<TeamClinic[]>("clinics"),
      ]);
      setClinicians(clinicianData);
      setServices(serviceData);
      setVans(vanData);
      setClinics(clinicData);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load the team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit<T>(key: string, path: string, payload: unknown, onDone: (created: T) => void) {
    setBusy(key);
    try {
      const created = await appRequest<T>(path, { method: "POST", body: JSON.stringify(payload) });
      onDone(created);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const addClinician = () => {
    const result = clinicianPayload(clinician);
    if (!result.ok) return toast.error(result.error);
    void submit<StaffCreated>("clinician", "clinicians", result.payload, (created) => {
      toast.success(inviteMessage(created));
      setClinician({ email: "", fullName: "", gdcNumber: "", roleTitle: "Dentist", isTelehealthActive: true });
    });
  };

  const addOperator = () => {
    const result = operatorPayload(operator);
    if (!result.ok) return toast.error(result.error);
    void submit<StaffCreated>("operator", "operators", result.payload, (created) => {
      toast.success(inviteMessage(created));
      setOperator({ email: "", fullName: "", phone: "" });
    });
  };

  const addService = () => {
    const result = servicePayload(service);
    if (!result.ok) return toast.error(result.error);
    void submit<TeamService>("service", "services", result.payload, (created) => {
      toast.success(`${created.name} added`);
      setService({ name: "", category: "checkup", durationMinutes: "30", price: "", deposit: "", channels: ["clinic"] });
    });
  };

  const addVan = () => {
    const result = vanPayload(van);
    if (!result.ok) return toast.error(result.error);
    void submit<TeamVan>("van", "vans", result.payload, (created) => {
      toast.success(`${created.name} added`);
      setVan({ name: "", registrationPlate: "", vehicleModel: "" });
    });
  };

  const addClinic = () => {
    const result = clinicPayload(clinic);
    if (!result.ok) return toast.error(result.error);
    void submit<TeamClinic>("clinic", "clinics", result.payload, (created) => {
      toast.success(`${created.name} added`);
      setClinic({ name: "", address: "", postcode: "", city: "", phone: "" });
    });
  };

  const toggleChannel = (channel: Channel, on: boolean) =>
    setService((s) => ({
      ...s,
      channels: on ? [...s.channels, channel] : s.channels.filter((c) => c !== channel),
    }));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground">Loading the team...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-destructive text-sm">{loadError}</p>
        <Button variant="outline" onClick={() => void load()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Clinicians</CardTitle>
          <CardDescription>
            Adding a clinician creates their app account and emails them a link to set a password. Set their hours on
            the Rota screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {clinicians.length === 0 ? (
            <p className="text-muted-foreground text-sm">No clinicians yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {clinicians.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span>
                    {c.fullName}
                    {c.roleTitle ? <span className="text-muted-foreground">, {c.roleTitle}</span> : null}
                  </span>
                  {c.isTelehealthActive ? <Badge variant="secondary">Video</Badge> : null}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="clinician-name" label="Full name">
              <Input
                id="clinician-name"
                value={clinician.fullName}
                onChange={(e) => setClinician({ ...clinician, fullName: e.target.value })}
              />
            </Field>
            <Field id="clinician-email" label="Email">
              <Input
                id="clinician-email"
                type="email"
                value={clinician.email}
                onChange={(e) => setClinician({ ...clinician, email: e.target.value })}
              />
            </Field>
            <Field id="clinician-gdc" label="GDC number">
              <Input
                id="clinician-gdc"
                inputMode="numeric"
                maxLength={6}
                value={clinician.gdcNumber}
                onChange={(e) => setClinician({ ...clinician, gdcNumber: e.target.value })}
              />
            </Field>
            <Field id="clinician-role" label="Role">
              <Input
                id="clinician-role"
                value={clinician.roleTitle}
                onChange={(e) => setClinician({ ...clinician, roleTitle: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="clinician-video"
              checked={clinician.isTelehealthActive}
              onCheckedChange={(v) => setClinician({ ...clinician, isTelehealthActive: v === true })}
            />
            <Label htmlFor="clinician-video">Takes video consultations</Label>
          </div>
          <Button className="self-start" onClick={addClinician} disabled={busy !== null}>
            {busy === "clinician" ? "Adding..." : "Add clinician"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Van operators</CardTitle>
          <CardDescription>
            Adding an operator creates their app account and emails them a link to set a password.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="operator-name" label="Full name">
              <Input
                id="operator-name"
                value={operator.fullName}
                onChange={(e) => setOperator({ ...operator, fullName: e.target.value })}
              />
            </Field>
            <Field id="operator-email" label="Email">
              <Input
                id="operator-email"
                type="email"
                value={operator.email}
                onChange={(e) => setOperator({ ...operator, email: e.target.value })}
              />
            </Field>
            <Field id="operator-phone" label="Phone (optional)">
              <Input
                id="operator-phone"
                type="tel"
                value={operator.phone}
                onChange={(e) => setOperator({ ...operator, phone: e.target.value })}
              />
            </Field>
          </div>
          <Button className="self-start" onClick={addOperator} disabled={busy !== null}>
            {busy === "operator" ? "Adding..." : "Add operator"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>What patients can book, with its price and deposit.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {services.length === 0 ? (
            <p className="text-muted-foreground text-sm">No services yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {services.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span>
                    {s.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {s.durationMinutes} min · {formatPounds(s.pricePence)}
                      {s.depositPence > 0 ? `, ${formatPounds(s.depositPence)} deposit` : ""}
                    </span>
                  </span>
                  {s.isActive ? null : <Badge variant="outline">Inactive</Badge>}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="service-name" label="Name">
              <Input
                id="service-name"
                value={service.name}
                onChange={(e) => setService({ ...service, name: e.target.value })}
              />
            </Field>
            <Field id="service-category" label="Category">
              <NativeSelect
                id="service-category"
                value={service.category}
                onChange={(e) => setService({ ...service, category: e.target.value as ServiceCategory })}
              >
                {SERVICE_CATEGORIES.map((c) => (
                  <NativeSelectOption key={c} value={c}>
                    {c[0].toUpperCase() + c.slice(1)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field id="service-length" label="Length (minutes)">
              <Input
                id="service-length"
                inputMode="numeric"
                value={service.durationMinutes}
                onChange={(e) => setService({ ...service, durationMinutes: e.target.value })}
              />
            </Field>
            <Field id="service-price" label="Price (£)">
              <Input
                id="service-price"
                inputMode="decimal"
                value={service.price}
                onChange={(e) => setService({ ...service, price: e.target.value })}
              />
            </Field>
            <Field id="service-deposit" label="Deposit (£, blank for none)">
              <Input
                id="service-deposit"
                inputMode="decimal"
                value={service.deposit}
                onChange={(e) => setService({ ...service, deposit: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {CHANNELS.map((channel) => (
              <div key={channel} className="flex items-center gap-2">
                <Checkbox
                  id={`service-${channel}`}
                  checked={service.channels.includes(channel)}
                  onCheckedChange={(v) => toggleChannel(channel, v === true)}
                />
                <Label htmlFor={`service-${channel}`}>{channel[0].toUpperCase() + channel.slice(1)}</Label>
              </div>
            ))}
          </div>
          <Button className="self-start" onClick={addService} disabled={busy !== null}>
            {busy === "service" ? "Adding..." : "Add service"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vans</CardTitle>
          <CardDescription>Mobile surgeries patients can request.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {vans.length === 0 ? (
            <p className="text-muted-foreground text-sm">No vans yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {vans.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <span>
                    {v.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {v.registrationPlate} · {v.vehicleModel}
                    </span>
                  </span>
                  {v.isActive ? null : <Badge variant="outline">Inactive</Badge>}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="van-name" label="Name">
              <Input id="van-name" value={van.name} onChange={(e) => setVan({ ...van, name: e.target.value })} />
            </Field>
            <Field id="van-plate" label="Registration plate">
              <Input
                id="van-plate"
                value={van.registrationPlate}
                onChange={(e) => setVan({ ...van, registrationPlate: e.target.value })}
              />
            </Field>
            <Field id="van-model" label="Vehicle model">
              <Input
                id="van-model"
                value={van.vehicleModel}
                onChange={(e) => setVan({ ...van, vehicleModel: e.target.value })}
              />
            </Field>
          </div>
          <Button className="self-start" onClick={addVan} disabled={busy !== null}>
            {busy === "van" ? "Adding..." : "Add van"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clinics</CardTitle>
          <CardDescription>Physical practice locations for in-person appointments.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {clinics.length === 0 ? (
            <p className="text-muted-foreground text-sm">No clinics yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {clinics.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span>
                    {c.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {c.address}, {c.city} · {c.postcode} · {c.phone}
                    </span>
                  </span>
                  {c.isActive ? null : <Badge variant="outline">Inactive</Badge>}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="clinic-name" label="Name">
              <Input
                id="clinic-name"
                value={clinic.name}
                onChange={(e) => setClinic({ ...clinic, name: e.target.value })}
              />
            </Field>
            <Field id="clinic-address" label="Address">
              <Input
                id="clinic-address"
                value={clinic.address}
                onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
              />
            </Field>
            <Field id="clinic-city" label="City">
              <Input
                id="clinic-city"
                value={clinic.city}
                onChange={(e) => setClinic({ ...clinic, city: e.target.value })}
              />
            </Field>
            <Field id="clinic-postcode" label="Postcode">
              <Input
                id="clinic-postcode"
                value={clinic.postcode}
                onChange={(e) => setClinic({ ...clinic, postcode: e.target.value })}
              />
            </Field>
            <Field id="clinic-phone" label="Phone">
              <Input
                id="clinic-phone"
                value={clinic.phone}
                onChange={(e) => setClinic({ ...clinic, phone: e.target.value })}
              />
            </Field>
          </div>
          <Button className="self-start" onClick={addClinic} disabled={busy !== null}>
            {busy === "clinic" ? "Adding..." : "Add clinic"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
