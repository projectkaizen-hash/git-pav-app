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
  activeToggleMessage,
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
  toPoundsInput,
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

/** Edit and Retire (or Bring back) on a service, van or clinic row. */
function RowActions(props: { onEdit: () => void; onToggle: () => void; isActive: boolean; disabled: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {props.isActive ? null : <Badge variant="outline">Retired</Badge>}
      <Button variant="ghost" size="sm" onClick={props.onEdit} disabled={props.disabled}>
        Edit
      </Button>
      <Button variant="ghost" size="sm" onClick={props.onToggle} disabled={props.disabled}>
        {props.isActive ? "Retire" : "Bring back"}
      </Button>
    </span>
  );
}

/** Add, or Save and Cancel while a row's details are in the form. */
function FormButtons(props: {
  editing: boolean;
  busy: boolean;
  disabled: boolean;
  addLabel: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!props.editing) {
    return (
      <Button className="self-start" onClick={props.onSave} disabled={props.disabled}>
        {props.busy ? "Adding..." : props.addLabel}
      </Button>
    );
  }
  return (
    <div className="flex gap-2">
      <Button onClick={props.onSave} disabled={props.disabled}>
        {props.busy ? "Saving..." : "Save changes"}
      </Button>
      <Button variant="outline" onClick={props.onCancel} disabled={props.disabled}>
        Cancel
      </Button>
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
  // The id of the service, van or clinic whose details are in the form (BE-10).
  const [editing, setEditing] = useState<{ service: string | null; van: string | null; clinic: string | null }>({
    service: null,
    van: null,
    clinic: null,
  });

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

  async function submit<T>(
    key: string,
    path: string,
    payload: unknown,
    onDone: (created: T) => void,
    method: "POST" | "PATCH" = "POST",
  ) {
    setBusy(key);
    try {
      const created = await appRequest<T>(path, { method, body: JSON.stringify(payload) });
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

  const blankService = {
    name: "",
    category: "checkup" as ServiceCategory,
    durationMinutes: "30",
    price: "",
    deposit: "",
    channels: ["clinic"] as Channel[],
  };
  const saveService = () => {
    const result = servicePayload(service);
    if (!result.ok) return toast.error(result.error);
    const id = editing.service;
    void submit<TeamService>(
      "service",
      id ? `services/${id}` : "services",
      result.payload,
      (saved) => {
        toast.success(id ? `${saved.name} saved. Bookings already made keep their price.` : `${saved.name} added`);
        setService(blankService);
        setEditing((e) => ({ ...e, service: null }));
      },
      id ? "PATCH" : "POST",
    );
  };
  const editService = (s: TeamService) => {
    setService({
      name: s.name,
      category: (SERVICE_CATEGORIES as readonly string[]).includes(s.category)
        ? (s.category as ServiceCategory)
        : "checkup",
      durationMinutes: String(s.durationMinutes),
      price: toPoundsInput(s.pricePence),
      deposit: s.depositPence > 0 ? toPoundsInput(s.depositPence) : "",
      channels: s.supportedChannels.filter((c): c is Channel => (CHANNELS as readonly string[]).includes(c)),
    });
    setEditing((e) => ({ ...e, service: s.id }));
  };

  const saveVan = () => {
    const result = vanPayload(van);
    if (!result.ok) return toast.error(result.error);
    const id = editing.van;
    void submit<TeamVan>(
      "van",
      id ? `vans/${id}` : "vans",
      result.payload,
      (saved) => {
        toast.success(id ? `${saved.name} saved` : `${saved.name} added`);
        setVan({ name: "", registrationPlate: "", vehicleModel: "" });
        setEditing((e) => ({ ...e, van: null }));
      },
      id ? "PATCH" : "POST",
    );
  };

  const saveClinic = () => {
    const result = clinicPayload(clinic);
    if (!result.ok) return toast.error(result.error);
    const id = editing.clinic;
    void submit<TeamClinic>(
      "clinic",
      id ? `clinics/${id}` : "clinics",
      result.payload,
      (saved) => {
        toast.success(id ? `${saved.name} saved` : `${saved.name} added`);
        setClinic({ name: "", address: "", postcode: "", city: "", phone: "" });
        setEditing((e) => ({ ...e, clinic: null }));
      },
      id ? "PATCH" : "POST",
    );
  };

  // Retire (or bring back) a service, van or clinic. Its past and booked
  // appointments stay as they are.
  const toggleActive = (kind: "services" | "vans" | "clinics", item: { id: string; name: string; isActive: boolean }) =>
    void submit<{ upcomingBookings?: number }>(
      `${kind}-${item.id}`,
      `${kind}/${item.id}`,
      { isActive: !item.isActive },
      (saved) => toast.success(activeToggleMessage(item.name, !item.isActive, saved.upcomingBookings ?? 0)),
      "PATCH",
    );

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
                  <RowActions
                    disabled={busy !== null}
                    isActive={s.isActive}
                    onEdit={() => editService(s)}
                    onToggle={() => toggleActive("services", s)}
                  />
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
          <FormButtons
            editing={editing.service !== null}
            busy={busy === "service"}
            disabled={busy !== null}
            addLabel="Add service"
            onSave={saveService}
            onCancel={() => {
              setService(blankService);
              setEditing((e) => ({ ...e, service: null }));
            }}
          />
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
                  <RowActions
                    disabled={busy !== null}
                    isActive={v.isActive}
                    onEdit={() => {
                      setVan({ name: v.name, registrationPlate: v.registrationPlate, vehicleModel: v.vehicleModel });
                      setEditing((e) => ({ ...e, van: v.id }));
                    }}
                    onToggle={() => toggleActive("vans", v)}
                  />
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
          <FormButtons
            editing={editing.van !== null}
            busy={busy === "van"}
            disabled={busy !== null}
            addLabel="Add van"
            onSave={saveVan}
            onCancel={() => {
              setVan({ name: "", registrationPlate: "", vehicleModel: "" });
              setEditing((e) => ({ ...e, van: null }));
            }}
          />
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
                  <RowActions
                    disabled={busy !== null}
                    isActive={c.isActive}
                    onEdit={() => {
                      setClinic({
                        name: c.name,
                        address: c.address,
                        postcode: c.postcode,
                        city: c.city,
                        phone: c.phone,
                      });
                      setEditing((e) => ({ ...e, clinic: c.id }));
                    }}
                    onToggle={() => toggleActive("clinics", c)}
                  />
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
          <FormButtons
            editing={editing.clinic !== null}
            busy={busy === "clinic"}
            disabled={busy !== null}
            addLabel="Add clinic"
            onSave={saveClinic}
            onCancel={() => {
              setClinic({ name: "", address: "", postcode: "", city: "", phone: "" });
              setEditing((e) => ({ ...e, clinic: null }));
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
