import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldLoadAnalytics } from "./analytics.ts";

test("analytics loads only after the visitor accepts cookies", () => {
  assert.equal(shouldLoadAnalytics("accepted", "G-KZVKDLY449"), true);
  assert.equal(shouldLoadAnalytics("declined", "G-KZVKDLY449"), false);
  assert.equal(shouldLoadAnalytics(null, "G-KZVKDLY449"), false);
});

test("analytics needs a real measurement id", () => {
  assert.equal(shouldLoadAnalytics("accepted", "G-XXXXXXXXXX"), false);
  assert.equal(shouldLoadAnalytics("accepted", ""), false);
  assert.equal(shouldLoadAnalytics("accepted", "UA-12345-1"), false);
});
