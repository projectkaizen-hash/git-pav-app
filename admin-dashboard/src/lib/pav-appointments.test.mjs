// Run with `npm test`. Node strips the types from pav-appointments.ts when it is imported.

import {
  APPOINTMENTS_PAGE_SIZE,
  appointmentsPath,
  auditDetails,
  auditPath,
  pageCount,
  statusChangeQuestion,
} from "./pav-appointments.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

const appointment = {
  id: "a1",
  patientId: "p1",
  patientName: "Synthetic Patient",
  dependantName: null,
  clinicianName: "Dr Synthetic",
  serviceName: "Check-up",
  channel: "clinic",
  placeName: "Synthetic Clinic",
  startTimeUtc: "2031-03-11T09:00:00.000Z",
  endTimeUtc: "2031-03-11T09:30:00.000Z",
  status: "confirmed",
  allowedStatuses: ["in_progress", "completed", "no_show", "cancelled"],
  totalPricePence: 6500,
  depositPaidPence: 1500,
};

describe("appointmentsPath", () => {
  it("sends only the filters that are set", () => {
    assert.equal(
      appointmentsPath({ status: "", channel: "", from: "", to: "" }),
      `appointments?page=1&limit=${APPOINTMENTS_PAGE_SIZE}`,
    );
    assert.equal(
      appointmentsPath({ status: "confirmed", channel: "van", from: "2031-03-11", to: "2031-03-12" }, 3),
      `appointments?page=3&limit=${APPOINTMENTS_PAGE_SIZE}&status=confirmed&channel=van&from=2031-03-11&to=2031-03-12`,
    );
  });

  it("drops a half-typed date and never asks for page 0", () => {
    assert.equal(
      appointmentsPath({ status: "", channel: "", from: "2031-03", to: "" }, 0),
      `appointments?page=1&limit=${APPOINTMENTS_PAGE_SIZE}`,
    );
  });
});

describe("auditPath", () => {
  it("lower-cases the action and leaves out one the backend would refuse", () => {
    assert.equal(
      auditPath({ action: " Admin.Appointment ", resourceId: " a1 " }),
      "audit-logs?page=1&limit=50&action=admin.appointment&resourceId=a1",
    );
    assert.equal(auditPath({ action: "GET /api", resourceId: "" }, 2), "audit-logs?page=2&limit=50");
  });
});

describe("pageCount", () => {
  it("is at least one page", () => {
    assert.equal(pageCount(0, 25), 1);
    assert.equal(pageCount(26, 25), 2);
  });
});

describe("statusChangeQuestion", () => {
  it("says the deposit is refunded when cancelling a paid booking", () => {
    const question = statusChangeQuestion(appointment, "cancelled");
    assert.match(question, /£15\.00 deposit is refunded/);
    assert.match(question, /can't be undone/);
  });

  it("says nothing is refunded when no deposit was paid", () => {
    assert.match(statusChangeQuestion({ ...appointment, depositPaidPence: 0 }, "cancelled"), /nothing is refunded/);
  });

  it("names the child and the guardian for a dependant's visit", () => {
    assert.match(
      statusChangeQuestion({ ...appointment, dependantName: "Sam" }, "in_progress"),
      /^Mark Sam \(booked by Synthetic Patient\)'s Check-up as "In progress"\?$/,
    );
  });

  it("mentions reward points on completion", () => {
    assert.match(statusChangeQuestion(appointment, "completed"), /reward points/);
  });
});

describe("auditDetails", () => {
  const entry = {
    id: "1",
    action: "x",
    actorEmail: null,
    actorRole: null,
    resourceId: null,
    timestampUtc: "",
    archived: false,
  };

  it("reads a status change", () => {
    assert.equal(
      auditDetails({ ...entry, metadata: { fromStatus: "confirmed", toStatus: "no_show" } }),
      "Confirmed → Didn't attend",
    );
  });

  it("keeps the outcome and simple fields, and hides request noise", () => {
    assert.equal(
      auditDetails({
        ...entry,
        metadata: { outcome: "denied", statusCode: 403, requestId: "r", path: "/p", field: "phone", nested: { a: 1 } },
      }),
      "denied · 403 · field: phone",
    );
    assert.equal(auditDetails({ ...entry, metadata: null }), "");
  });
});
