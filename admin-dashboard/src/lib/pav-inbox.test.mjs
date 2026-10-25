// Run with `npm test`. Node strips the types from pav-inbox.ts when it is imported.

import { inboxPath, PAGE_SIZE, REPLY_MAX, replyPayload } from "./pav-inbox.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("inboxPath", () => {
  it("asks for practice threads a page at a time", () => {
    assert.equal(inboxPath("practice"), `messages?limit=${PAGE_SIZE}&offset=0&recipientType=practice`);
    assert.equal(inboxPath("practice", 25), `messages?limit=${PAGE_SIZE}&offset=25&recipientType=practice`);
  });

  it("leaves the filter off for all threads and never sends a negative offset", () => {
    assert.equal(inboxPath("all", -5), `messages?limit=${PAGE_SIZE}&offset=0`);
  });
});

describe("replyPayload", () => {
  it("trims the reply", () => {
    assert.deepEqual(replyPayload("  Thanks, see you Monday.  "), { body: "Thanks, see you Monday." });
  });

  it("refuses an empty or over-long reply", () => {
    assert.equal(replyPayload("   "), null);
    assert.equal(replyPayload("x".repeat(REPLY_MAX + 1)), null);
    assert.deepEqual(replyPayload("x".repeat(REPLY_MAX)), { body: "x".repeat(REPLY_MAX) });
  });
});
