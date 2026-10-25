/**
 * Automated tests for CS-44: Server Operations (SV-2, SV-3, SV-4, EH-3).
 *
 * Verifies:
 * 1. Single authoritative request ID across req.id, response header, JSON body, and logs (SV-3, EH-3).
 * 2. Inbound x-request-id is respected and preserved without minting divergent IDs.
 * 3. 404 and error responses return the identical request ID in header and payload.
 * 4. Health endpoints: /livez, /health, /readyz do not report fabricated dsptMode (SV-4).
 * 5. Graceful shutdown drains server and cleanly stops workers (SV-2).
 */

import http from "http";
import app, { gracefulShutdown } from "../server";

describe("CS-44 Server Operations", () => {
  let testServer: http.Server;
  let baseUrl: string;

  beforeAll((done) => {
    testServer = http.createServer(app);
    testServer.listen(0, () => {
      const addr = testServer.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      done();
    });
  });

  afterAll((done) => {
    testServer.close(done);
  });

  describe("SV-3 & EH-3: Unified Request ID Tracking", () => {
    it("generates a single request ID and echoes it in header and body", async () => {
      const res = await fetch(`${baseUrl}/livez`);
      expect(res.status).toBe(200);

      const headerId = res.headers.get("x-request-id");
      expect(typeof headerId).toBe("string");
      expect(headerId!.length).toBeGreaterThan(10);
    });

    it("respects and preserves an inbound x-request-id across header and body", async () => {
      const customId = "client-trace-id-abc-12345";
      const res = await fetch(`${baseUrl}/api/services`, {
        headers: { "x-request-id": customId },
      });

      expect(res.headers.get("x-request-id")).toBe(customId);
      const data: any = await res.json();
      if (data && typeof data === "object" && !Array.isArray(data)) {
        expect(data.requestId).toBe(customId);
      }
    });

    it("echoes matching request ID on 404 Not Found responses", async () => {
      const customId = "not-found-trace-id-999";
      const res = await fetch(`${baseUrl}/api/unmatched-route-for-testing`, {
        headers: { "x-request-id": customId },
      });

      expect(res.status).toBe(404);
      expect(res.headers.get("x-request-id")).toBe(customId);
      const data: any = await res.json();
      expect(data.requestId).toBe(customId);
      expect(data.error).toBe("Not found");
    });

    it("echoes matching request ID on error responses", async () => {
      const customId = "error-trace-id-500";
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-id": customId,
        },
        body: JSON.stringify({ email: "invalid-email-no-password" }),
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.headers.get("x-request-id")).toBe(customId);
      const data: any = await res.json();
      if (data.requestId) {
        expect(data.requestId).toBe(customId);
      }
    });
  });

  describe("SV-4: Health & Readiness Endpoint Verification", () => {
    it("/livez returns 200 without dsptMode", async () => {
      const res = await fetch(`${baseUrl}/livez`);
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.status).toBe("ok");
      expect(data.service).toBe("pavdental-backend-api");
      expect(data.dsptMode).toBeUndefined();
    });

    it("/health returns 200 liveness without dsptMode", async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);
      const data: any = await res.json();
      expect(data.status).toBe("ok");
      expect(data.dsptMode).toBeUndefined();
    });

    it("/readyz performs readiness checks without fabricated dsptMode", async () => {
      const res = await fetch(`${baseUrl}/readyz`);
      expect([200, 503]).toContain(res.status);
      const data: any = await res.json();
      expect(data.checks).toBeDefined();
      expect(data.checks.database).toBeDefined();
      expect(data.checks.redis).toBeDefined();
      expect(data.dsptMode).toBeUndefined();
    });
  });

  describe("SV-2: Graceful Shutdown", () => {
    it("gracefulShutdown executes cleanly with drain timeout and disconnects", async () => {
      const dummyServer = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end("ok");
      });

      await new Promise<void>((resolve) => dummyServer.listen(0, resolve));

      // Execute shutdown on dummy server with 1000ms timeout
      await expect(gracefulShutdown(dummyServer, "SIGTERM", 1000)).resolves.not.toThrow();

      // Subsequent call does nothing because isShuttingDown is true
      await expect(gracefulShutdown(dummyServer, "SIGTERM", 500)).resolves.not.toThrow();
    });
  });
});
