import http from "http";
import crypto from "crypto";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import app from "../server";

// BE-10: staff can fix or retire a service, clinic or van, and a retired one
// takes no new bookings or shifts. Synthetic data only.
describe("admin edits to services, clinics and vans", () => {
  let server: http.Server;
  let baseUrl: string;
  const tag = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const serviceIds: string[] = [];
  const clinicIds: string[] = [];
  const vanIds: string[] = [];
  let adminToken = "";
  let patientToken = "";

  async function makeUser(role: "patient" | "admin" | "operator", label: string) {
    const user = await prisma.user.create({ data: { email: `${label}-${tag}@example.test`, passwordHash: "x", role } });
    userIds.push(user.id);
    return { userId: user.id, token: signAccessToken({ sub: user.id, role, sessionId: crypto.randomUUID() }) };
  }

  const send = <T = Record<string, unknown>>(method: string, path: string, token?: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: (await r.json()) as T }));

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3030, resolve));
    baseUrl = "http://localhost:3030";
    adminToken = (await makeUser("admin", "edit-admin")).token;
    const patient = await makeUser("patient", "edit-patient");
    await prisma.patientProfile.create({ data: { userId: patient.userId, firstName: "Synthetic", lastName: "Patient" } });
    patientToken = patient.token;
  });

  afterAll(async () => {
    await prisma.vanShift.deleteMany({ where: { vanId: { in: vanIds } } });
    await prisma.van.deleteMany({ where: { id: { in: vanIds } } });
    await prisma.clinic.deleteMany({ where: { id: { in: clinicIds } } });
    await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
    await prisma.patientProfile.deleteMany({ where: { userId: { in: userIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("edits a service, checks the deposit, and retires it from new bookings", async () => {
    const created = await send<{ id: string }>("POST", "/api/admin/services", adminToken, {
      name: `Synthetic check ${tag}`,
      pricePence: 5000,
      depositPence: 1000,
      supportedChannels: ["video"],
    });
    expect(created.status).toBe(201);
    const id = created.body.id;
    serviceIds.push(id);

    const edited = await send("PATCH", `/api/admin/services/${id}`, adminToken, { pricePence: 6000, description: "Synthetic." });
    expect(edited.status).toBe(200);
    expect(edited.body).toMatchObject({ pricePence: 6000, depositPence: 1000, description: "Synthetic.", upcomingBookings: 0 });

    expect((await send("PATCH", `/api/admin/services/${id}`, adminToken, { depositPence: 7000 })).status).toBe(400);
    expect((await send("PATCH", `/api/admin/services/${id}`, adminToken, {})).status).toBe(400);
    expect((await send("PATCH", `/api/admin/services/${id}`, adminToken, { supportedChannels: [] })).status).toBe(400);
    expect((await send("PATCH", `/api/admin/services/${id}`, adminToken, { id: "srv_other" })).status).toBe(400);
    expect((await send("PATCH", "/api/admin/services/srv_missing", adminToken, { name: "Synthetic" })).status).toBe(404);
    expect((await send("PATCH", `/api/admin/services/${id}`, patientToken, { pricePence: 1 })).status).toBe(403);

    expect((await send("PATCH", `/api/admin/services/${id}`, adminToken, { isActive: false })).status).toBe(200);
    const listed = await send<{ id: string }[]>("GET", "/api/services");
    expect(listed.body.map((s) => s.id)).not.toContain(id);
    const booking = await send("POST", "/api/booking/appointments", patientToken, {
      serviceId: id,
      channel: "video",
      startTimeUtc: new Date(Date.now() + 5 * 86400000).toISOString(),
    });
    expect(booking.status).toBe(409);
  });

  it("edits and retires a clinic", async () => {
    const created = await send<{ id: string }>("POST", "/api/admin/clinics", adminToken, {
      name: `Synthetic Clinic ${tag}`,
      address: "1 Example Street",
      postcode: "ZZ1 1ZZ",
      city: "Testville",
      phone: "00000",
    });
    expect(created.status).toBe(201);
    const id = created.body.id;
    clinicIds.push(id);

    const edited = await send("PATCH", `/api/admin/clinics/${id}`, adminToken, { phone: "11111", address: "2 Example Street" });
    expect(edited.body).toMatchObject({ phone: "11111", address: "2 Example Street", name: `Synthetic Clinic ${tag}` });

    await send("PATCH", `/api/admin/clinics/${id}`, adminToken, { isActive: false });
    const clinics = await send<{ id: string }[]>("GET", "/api/services/clinics");
    expect(clinics.body.map((c) => c.id)).not.toContain(id);
    expect((await send("PATCH", `/api/admin/clinics/${crypto.randomUUID()}`, adminToken, { phone: "11111" })).status).toBe(404);
  });

  it("edits a van, refuses a taken plate, and won't retire it mid-shift", async () => {
    const make = async (plate: string) => {
      const res = await send<{ id: string }>("POST", "/api/admin/vans", adminToken, {
        name: `Synthetic Van ${plate}`,
        registrationPlate: plate,
        vehicleModel: "Synthetic model",
      });
      expect(res.status).toBe(201);
      vanIds.push(res.body.id);
      return res.body.id;
    };
    const a = await make(`ZZ${tag.slice(0, 4)}A`);
    await make(`ZZ${tag.slice(0, 4)}B`);

    expect((await send("PATCH", `/api/admin/vans/${a}`, adminToken, { name: "Renamed van" })).body).toMatchObject({ name: "Renamed van" });
    expect((await send("PATCH", `/api/admin/vans/${a}`, adminToken, { registrationPlate: `ZZ${tag.slice(0, 4)}B` })).status).toBe(409);

    const operator = await makeUser("operator", "edit-operator");
    const profile = await prisma.operatorProfile.create({ data: { userId: operator.userId, fullName: "Synthetic Operator" } });
    await prisma.vanShift.create({ data: { vanId: a, operatorId: profile.id } });
    expect((await send("PATCH", `/api/admin/vans/${a}`, adminToken, { isActive: false })).status).toBe(409);

    await prisma.vanShift.updateMany({ where: { vanId: a }, data: { endedAt: new Date(), status: "offline" } });
    expect((await send("PATCH", `/api/admin/vans/${a}`, adminToken, { isActive: false })).body).toMatchObject({ isActive: false });
  });
});
