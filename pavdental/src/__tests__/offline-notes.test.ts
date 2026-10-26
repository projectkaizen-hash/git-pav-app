import { CHUNK_CHARS, enqueueNote, flushQueue, QUEUE_KEY, readQueue, type KeyValueStore } from "../features/van/offline-notes-queue";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (k) => data.get(k) ?? null,
    set: async (k, v) => void data.set(k, v),
    remove: async (k) => void data.delete(k),
  };
}

const note = (stopId: string, notes: string, userId = "op-1") => ({ stopId, notes, userId, queuedAt: "2026-10-26T09:00:00.000Z" });

async function runTests() {
  console.log("\n🚐 RUNNING MF-05 OFFLINE VAN NOTES TESTS...\n");

  const store = memoryStore();
  // Synthetic note text, long enough to need several pieces.
  const long = "Synthetic examination note. ".repeat(200);
  await enqueueNote(store, note("stop-a", long));
  await enqueueNote(store, note("stop-b", "Short synthetic note."));
  assert(
    [...store.data.values()].every((v) => v.length <= CHUNK_CHARS),
    "no stored piece is over the size limit, however long the notes",
  );
  const queue = await readQueue(store);
  assert(queue.length === 2 && queue[0].notes === long, "the queue reads back exactly");

  await enqueueNote(store, note("stop-b", "Corrected synthetic note."));
  assert((await readQueue(store)).filter((n) => n.stopId === "stop-b").length === 1, "saving a stop again replaces its note");

  // Network down for stop-a, stop-b goes through.
  const sent: string[] = [];
  let left = await flushQueue(store, "op-1", async (n) => {
    if (n.stopId === "stop-a") throw new Error("offline");
    sent.push(n.stopId);
    return "sent";
  });
  assert(left === 1 && sent.join() === "stop-b", "a sent note leaves the queue and a failed one stays");

  // Another operator signed in on this phone: their session doesn't send it.
  left = await flushQueue(store, "op-2", async () => "sent");
  assert(left === 0 && (await readQueue(store)).length === 1, "notes are only sent by the operator who wrote them");

  left = await flushQueue(store, "op-1", async () => "sent");
  assert(left === 0 && (await readQueue(store)).length === 0, "the queue empties once everything is sent");
  assert([...store.data.keys()].every((k) => !k.startsWith(`${QUEUE_KEY}_`) || k === `${QUEUE_KEY}_count`), "leftover pieces are removed");

  // A queue saved by the old version (one value) is still read and sent.
  const legacy = memoryStore();
  await legacy.set(QUEUE_KEY, JSON.stringify([{ stopId: "old", notes: "Synthetic", queuedAt: "2026-10-25T09:00:00.000Z" }]));
  assert((await readQueue(legacy)).length === 1, "reads a queue saved before this change");
  await flushQueue(legacy, "op-1", async () => "sent");
  assert((await legacy.get(QUEUE_KEY)) === null, "and clears it once sent");
}

runTests();
