import http from "http";
import crypto from "crypto";
import { londonTimeToUtc } from "../lib/availability";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import app from "../server";

// DB-05: the staff appointments list names the patient, dentist, service and
// place, filters by UK day, and says which status changes are allowed; the
// audit log can be filtered to one record. Synthetic data only.
describe("admin appointments list and audit log", () => {
  let server: http.Server;
  let baseUrl: string;
  const tag = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const appointmentIds: string[] = [];
  let serviceId = "";
  let adminToken = "";
  let patientToken = "";
  const day = "2031-03-11";

  const get = <T = Record<string, unknown>>(path: string, token = adminToken) =>
    fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then(async (r) => ({
      status: r.status,
      body: (await r.json()) as T,
    }));

  type Row = { id: string; patientName: string; serviceName: string; placeName: string | null; status: string; allowedStatuses: string[] };

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3031, resolve));
    baseUrl = "http://localhost:3031";

    const admin = await prisma.user.create({ data: { email: `list-admin-${tag}@example.test`, passwordHash: "x", role: "admin" } });
    const patient = await prisma.user.create({ data: { email: `list-patient-${tag}@example.test`, passwordHash: "x", role: "patient" } });
    userIds.push(admin.id, patient.id);
    adminToken = signAccessToken({ sub: admin.id, role: "admin", sessionId: crypto.randomUUID() });
    patientToken = signAccessToken({ sub: patient.id, role: "patient", sessionId: crypto.randomUUID() });
    const profile = await prisma.patientProfile.create({ data: { userId: patient.id, firstName: "Synthetic", lastName: `Listed${tag}` } });

    serviceId = `srv_list_${tag}`;
    await prisma.service.create({
      data: { id: serviceId, name: `Synthetic list check ${tag}`, category: "checkup", description: "Synthetic.", durationMinutes: 30, pricePence: 5000, depositPence: 0, supportedChannels: ["video"] },
    });

    // 23:30 UK time on the day, which is still that day in the UK; one more the next morning.
    for (const minute of [9 * 60, 23 * 60 + 30, 24 * 60 + 9 * 60]) {
      const start = londonTimeToUtc(day, minute);
      const appointment = await prisma.appointment.create({
        data: { patientId: profile.id, serviceId, channel: "video", startTimeUtc: start, endTimeUtc: new Date(start.getTime() + 30 * 60000), status: "confirmed", totalPricePence: 5000 },
      });
      appointmentIds.push(appointment.id);
    }
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.service.deleteMany({ where: { id: serviceId } });
    await prisma.patientProfile.deleteMany({ where: { userId: { in: userIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("lists one UK day with names and the allowed status changes", async () => {
    const res = await get<{ appointments: Row[]; total: number }>(`/api/admin/appointments?from=${day}&to=${day}&channel=video&limit=100`);
    expect(res.status).toBe(200);
    const ours = res.body.appointments.filter((a) => appointmentIds.includes(a.id));
    expect(ours.map((a) => a.id).sort()).toEqual(appointmentIds.slice(0, 2).sort());
    expect(ours[0]).toMatchObject({
      patientName: `Synthetic Listed${tag}`,
      serviceName: `Synthetic list check ${tag}`,
      placeName: null,
      status: "confirmed",
      allowedStatuses: ["in_progress", "completed", "no_show", "cancelled"],
    });

    expect((await get(`/api/admin/appointments?from=2031-02-30x`)).status).toBe(400);
    expect((await get(`/api/admin/appointments`, patientToken)).status).toBe(403);
  });

  it("finds a status change in the audit log by the appointment it was about", async () => {
    const id = appointmentIds[0];
    const patched = await fetch(`${baseUrl}/api/admin/appointments/${id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status: "no_show" }),
    });
    expect(patched.status).toBe(200);

    const listed = await get<{ appointments: Row[] }>(`/api/admin/appointments?from=${day}&to=${day}&status=no_show`);
    expect(listed.body.appointments.find((a) => a.id === id)).toMatchObject({ status: "no_show", allowedStatuses: [] });

    const logs = await get<{ logs: Record<string, unknown>[]; total: number }>(`/api/admin/audit-logs?action=admin.appointment&resourceId=${id}`);
    expect(logs.status).toBe(200);
    expect(logs.body.total).toBe(1);
    expect(logs.body.logs[0]).toMatchObject({
      action: "admin.appointment.status_updated",
      actorEmail: `list-admin-${tag}@example.test`,
      actorRole: "admin",
      metadata: { fromStatus: "confirmed", toStatus: "no_show" },
    });
    expect(logs.body.logs[0]).not.toHaveProperty("integrityHash");
    expect(logs.body.logs[0]).not.toHaveProperty("ipHash");
    expect((await get(`/api/admin/audit-logs?action=DROP%20TABLE`)).status).toBe(400);
  });
});
