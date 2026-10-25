// Audit entries are written after the response is sent, so a test file can
// finish with an append still running. If jest tears the file down mid-append,
// that transaction keeps the audit chain lock until it times out and stalls
// every other suite's audit writes. Wait for the queue before teardown.
afterAll(async () => {
  const queue = (globalThis as { __pavAuditWriteQueue?: Promise<unknown> }).__pavAuditWriteQueue;
  if (queue) await queue;
  try {
    const { prisma } = require("../src/lib/prisma");
    await prisma.$disconnect();
  } catch {}
}, 30_000);
export {};
