// Fills the per-side unread flags added in 20261025090000_cs29_per_side_read_state
// from the old shared is_read flag. A thread that was unread is unread for
// whoever did not send its last message. Prints counts only. Without --apply it
// changes nothing; with --apply it updates in batches and is safe to run again.
import { PrismaClient } from "@prisma/client";

const BATCH = 500;

async function main() {
  const prisma = new PrismaClient();
  const apply = process.argv.includes("--apply");
  try {
    // Only threads still on the old flag: unread, with neither new flag set.
    const where = { isRead: false, patientUnread: false, staffUnread: false };
    const pending = await prisma.messageThread.count({ where });
    console.log(`${pending} unread thread(s) to backfill`);
    if (!apply || pending === 0) return;

    let done = 0;
    for (;;) {
      const threads = await prisma.messageThread.findMany({
        where,
        select: {
          id: true,
          messages: { orderBy: { sentAt: "desc" }, take: 1, select: { senderRole: true } },
        },
        orderBy: { id: "asc" },
        take: BATCH,
      });
      if (threads.length === 0) break;
      const toStaff = threads.filter((t) => (t.messages[0]?.senderRole ?? "patient") === "patient").map((t) => t.id);
      const toPatient = threads.filter((t) => !toStaff.includes(t.id)).map((t) => t.id);
      // Raw SQL, because a Prisma update would bump updated_at and reorder the inbox.
      if (toStaff.length > 0) {
        await prisma.$executeRaw`UPDATE message_threads SET staff_unread = true WHERE id = ANY(${toStaff}::uuid[])`;
      }
      if (toPatient.length > 0) {
        await prisma.$executeRaw`UPDATE message_threads SET patient_unread = true WHERE id = ANY(${toPatient}::uuid[])`;
      }
      done += threads.length;
      console.log(`backfilled ${done}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "backfill-thread-read-state failed");
  process.exit(1);
});
