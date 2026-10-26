// Run with `npm test`. Production builds strip console calls, but never
// console.error or console.warn: they are the dashboard's server error log.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("next.config compiler.removeConsole", () => {
  it("keeps error and warn in production builds", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const { default: config } = await import(`../next.config.mjs?production=${Date.now()}`);
      assert.deepEqual(config.compiler.removeConsole, { exclude: ["error", "warn"] });
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
