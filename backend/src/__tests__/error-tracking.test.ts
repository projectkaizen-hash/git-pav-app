import express from "express";
import http from "http";
import "express-async-errors";
import { createTransport } from "@sentry/core";
import { initErrorTracking, scrubText } from "../lib/error-tracking";
import { errorHandler } from "../middleware/error-handler";

// CS-44: what reaches Sentry is the error type, a scrubbed message, the
// stack and safe tags. Never the request body, headers, cookies, query or
// user. Synthetic data only.
describe("error tracking", () => {
  const sent: string[] = [];
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    initErrorTracking({
      dsn: "https://public@o0.ingest.sentry.io/0",
      transport: (options) =>
        createTransport(options, async (request) => {
          sent.push(typeof request.body === "string" ? request.body : new TextDecoder().decode(request.body));
          return { statusCode: 200 };
        }),
    });
    const app = express();
    app.use(express.json());
    app.post("/api/things/:id", () => {
      throw new Error("Lookup failed for jane.patient@example.test, postcode ZZ1 1ZZ, phone 07700 900123");
    });
    app.get("/api/teapot", () => {
      const err = new Error("short and stout") as Error & { status?: number };
      throw Object.assign(new (require("../middleware/error-handler").HttpError)(418, "I'm a teapot"), { cause: err });
    });
    app.use(errorHandler);
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3020, resolve));
    baseUrl = "http://localhost:3020";
  });

  afterAll(async () => {
    await require("@sentry/node").close(2000);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("scrubs emails, postcodes, phone numbers and tokens from text", () => {
    expect(scrubText("jane@example.test ZZ1 1ZZ +44 7700 900123 eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc sk_test_abc123")).toBe(
      "[email] [postcode] [phone] [token] [key]"
    );
  });

  it("reports a 500 with tags and nothing from the request", async () => {
    const res = await fetch(`${baseUrl}/api/things/123?name=Jane`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer secret-token", Cookie: "session=abc" },
      body: JSON.stringify({ notes: "Synthetic clinical note", email: "jane.patient@example.test" }),
    });
    expect(res.status).toBe(500);
    await require("@sentry/node").flush(2000);

    expect(sent).toHaveLength(1);
    const envelope = sent[0];
    expect(envelope).toContain("Lookup failed for [email], postcode [postcode], phone [phone]");
    expect(envelope).toContain('"route":"/api/things/:id"');
    for (const leaked of ["jane.patient", "Synthetic clinical note", "secret-token", "session=abc", "name=Jane", "ZZ1 1ZZ", "07700"]) {
      expect(envelope).not.toContain(leaked);
    }
  });

  it("doesn't report expected errors below 500", async () => {
    const before = sent.length;
    expect((await fetch(`${baseUrl}/api/teapot`)).status).toBe(418);
    await require("@sentry/node").flush(2000);
    expect(sent.length).toBe(before);
  });
});
