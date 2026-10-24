import { prisma } from "../src/lib/prisma";

jest.setTimeout(30_000);

afterAll(async () => {
  const queue = (globalThis as { __pavAuditWriteQueue?: Promise<unknown> }).__pavAuditWriteQueue;
  if (queue) await queue;
  await prisma.$disconnect().catch(() => {});
}, 30_000);
export {};
