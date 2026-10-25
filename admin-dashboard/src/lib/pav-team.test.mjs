// Run with `npm test`. Node strips the types from pav-team.ts when it is imported.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clinicianPayload, operatorPayload, servicePayload, toPence, vanPayload } from "./pav-team.ts";

describe("toPence", () => {
  it("reads pounds with up to two decimals", () => {
    assert.equal(toPence("65"), 6500);
    assert.equal(toPence("65.5"), 6550);
    assert.equal(toPence(" 65.05 "), 6505);
    assert.equal(toPence("0"), 0);
  });

  it("refuses anything else", () => {
    for (const bad of ["", "£65", "65.555", "-1", "1e3", "six"]) assert.equal(toPence(bad), null, bad);
  });
});

describe("clinicianPayload", () => {
  const form = {
    email: "dr.synthetic@example.test",
    fullName: "Dr Synthetic",
    gdcNumber: "123456",
    roleTitle: "Dentist",
    isTelehealthActive: true,
  };

  it("trims and passes a valid form", () => {
    const result = clinicianPayload({ ...form, email: " dr.synthetic@example.test " });
    assert.equal(result.ok, true);
    assert.equal(result.payload.email, "dr.synthetic@example.test");
  });

  it("needs a 6-digit GDC number and an email", () => {
    assert.equal(clinicianPayload({ ...form, gdcNumber: "12345" }).ok, false);
    assert.equal(clinicianPayload({ ...form, gdcNumber: "12345a" }).ok, false);
    assert.equal(clinicianPayload({ ...form, email: "not-an-email" }).ok, false);
  });
});

describe("operatorPayload", () => {
  it("leaves a blank phone out", () => {
    const result = operatorPayload({ email: "op@example.test", fullName: "Synthetic Operator", phone: " " });
    assert.deepEqual(result, { ok: true, payload: { email: "op@example.test", fullName: "Synthetic Operator" } });
  });
});

describe("servicePayload", () => {
  const form = {
    name: "Synthetic check-up",
    category: "checkup",
    durationMinutes: "30",
    price: "65",
    deposit: "",
    channels: ["clinic"],
  };

  it("converts pounds to pence and a blank deposit to none", () => {
    const result = servicePayload(form);
    assert.equal(result.ok, true);
    assert.equal(result.payload.pricePence, 6500);
    assert.equal(result.payload.depositPence, 0);
  });

  it("refuses a deposit above the price, no channels, or a bad length", () => {
    assert.equal(servicePayload({ ...form, deposit: "70" }).ok, false);
    assert.equal(servicePayload({ ...form, channels: [] }).ok, false);
    assert.equal(servicePayload({ ...form, durationMinutes: "2" }).ok, false);
    assert.equal(servicePayload({ ...form, durationMinutes: "30.5" }).ok, false);
  });
});

describe("vanPayload", () => {
  it("upper-cases the plate", () => {
    const result = vanPayload({ name: "Van 1", registrationPlate: "ab12 cde", vehicleModel: "Synthetic van" });
    assert.equal(result.payload.registrationPlate, "AB12 CDE");
  });
});
