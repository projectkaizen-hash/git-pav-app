// Run with `npm test`.
// Tests for DB-06: single allowed origin per response, no comma-separated origins,
// and origin validation for credentials mode.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ALLOWED_ORIGINS, getCorsHeaders } from "./cors.ts";

describe("CORS single-origin headers (DB-06, AUD-15)", () => {
  it("returns exactly one allowed origin for a trusted origin without commas", () => {
    for (const origin of ALLOWED_ORIGINS) {
      const headers = getCorsHeaders(origin);
      assert.equal(headers["Access-Control-Allow-Origin"], origin);
      assert.ok(!headers["Access-Control-Allow-Origin"].includes(","), "Origin must not contain commas");
      assert.equal(headers["Access-Control-Allow-Credentials"], "true");
      assert.equal(headers.Vary, "Origin");
    }
  });

  it("does not allow an untrusted origin", () => {
    const headers = getCorsHeaders("https://malicious-attacker.test");
    assert.equal(headers["Access-Control-Allow-Origin"], undefined);
  });

  it("falls back to primary allowed origin when origin header is missing", () => {
    const headers = getCorsHeaders(null);
    assert.equal(headers["Access-Control-Allow-Origin"], ALLOWED_ORIGINS[0]);
    assert.ok(!headers["Access-Control-Allow-Origin"].includes(","));
  });

  it("ensures next.config.mjs does not set a global comma-joined CORS header", async () => {
    const { default: config } = await import(`../../next.config.mjs?cors=${Date.now()}`);
    if (typeof config.headers === "function") {
      const headersList = await config.headers();
      for (const entry of headersList) {
        for (const h of entry.headers || []) {
          if (h.key.toLowerCase() === "access-control-allow-origin") {
            assert.ok(!h.value.includes(","), `Found comma-separated origin in next.config.mjs: ${h.value}`);
          }
        }
      }
    }
  });
});
