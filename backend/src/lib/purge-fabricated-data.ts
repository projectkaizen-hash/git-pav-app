import { Prisma, type PrismaClient } from "@prisma/client";

// Rows the API used to invent for every new patient (CS-05). Decisions log #3:
// they are removed from real environments. Matching is on the exact invented
// content, so anything a person actually wrote or a clinician recorded stays.

export const FABRICATED_THREAD_SUBJECTS = [
  "Post-examination odontogram & treatment plan ready",
  "AirFlow® aftercare & interdental brushing guide",
  "Deposit receipt & booking confirmation",
];

export const FABRICATED_THREAD_SENDERS = [
  "Dr. Tariq Pav · Clinical Lead",
  "Elena Rostova · Dental Hygienist (RDH)",
  "Pav Dental Reception · Marylebone",
];

export const FABRICATED_PRACTITIONER_ADVICE =
  "Focus gentle circular motions on the distal aspect of Tooth #31 (LR7) to prevent early enamel demineralisation from progressing into the dentine. Continue daily interdental brushing.";

export const FABRICATED_WEEKLY_BRUSHING = [
  { day: "Mon", am: true, pm: true, durationSec: 245 },
  { day: "Tue", am: true, pm: true, durationSec: 250 },
  { day: "Wed", am: true, pm: true, durationSec: 240 },
  { day: "Thu", am: true, pm: true, durationSec: 260 },
  { day: "Fri", am: true, pm: true, durationSec: 240 },
  { day: "Sat", am: true, pm: true, durationSec: 240 },
  { day: "Sun", am: true, pm: false, durationSec: 120 },
];

// The invented clinical measures were always created together.
const FABRICATED_MEASURES = { plaqueIndexPercent: 12, bleedingPercent: 4, recallDaysRemaining: 42 };

export interface PurgeReport {
  messageThreadsDeleted: number;
  messageThreadsKeptWithReplies: number;
  practitionerAdviceCleared: number;
  clinicalMeasuresCleared: number;
  brushingWeeksCleared: number;
  pointsAndStreaksReset: number;
  financingApprovalsDeleted: number;
}

/**
 * Removes or clears invented data. With apply=false nothing is written and the
 * report says what would change. Counts only: no patient data is returned.
 */
export async function purgeFabricatedData(prisma: PrismaClient, { apply }: { apply: boolean }): Promise<PurgeReport> {
  return prisma.$transaction(async (tx) => {
    const seededThreads = await tx.messageThread.findMany({
      where: { subject: { in: FABRICATED_THREAD_SUBJECTS }, senderName: { in: FABRICATED_THREAD_SENDERS } },
      select: { id: true, _count: { select: { messages: true } } },
    });
    // A thread the patient replied to holds their own words; leave it for a person to review.
    const untouched = seededThreads.filter((t) => t._count.messages <= 1).map((t) => t.id);

    const adviceWhere = { practitionerAdvice: FABRICATED_PRACTITIONER_ADVICE };
    const measuresWhere = FABRICATED_MEASURES;
    const brushingWhere = { weeklyBrushing: { equals: FABRICATED_WEEKLY_BRUSHING } };
    // No feature has ever earned real points, so every balance and streak is invented.
    const pointsWhere = { OR: [{ pointsBalance: { not: 0 } }, { streakDays: { not: 0 } }] };
    const financingWhere = { status: "pre_approved" };

    if (!apply) {
      return {
        messageThreadsDeleted: untouched.length,
        messageThreadsKeptWithReplies: seededThreads.length - untouched.length,
        practitionerAdviceCleared: await tx.oralHealthMetric.count({ where: adviceWhere }),
        clinicalMeasuresCleared: await tx.oralHealthMetric.count({ where: measuresWhere }),
        brushingWeeksCleared: await tx.oralHealthMetric.count({ where: brushingWhere }),
        pointsAndStreaksReset: await tx.oralHealthMetric.count({ where: pointsWhere }),
        financingApprovalsDeleted: await tx.financingApplication.count({ where: financingWhere }),
      };
    }

    const threads = await tx.messageThread.deleteMany({ where: { id: { in: untouched } } });
    const advice = await tx.oralHealthMetric.updateMany({ where: adviceWhere, data: { practitionerAdvice: null } });
    const measures = await tx.oralHealthMetric.updateMany({
      where: measuresWhere,
      data: { plaqueIndexPercent: null, bleedingPercent: null, recallDaysRemaining: null },
    });
    const brushing = await tx.oralHealthMetric.updateMany({ where: brushingWhere, data: { weeklyBrushing: Prisma.DbNull } });
    const points = await tx.oralHealthMetric.updateMany({ where: pointsWhere, data: { pointsBalance: 0, streakDays: 0 } });
    const financing = await tx.financingApplication.deleteMany({ where: financingWhere });

    return {
      messageThreadsDeleted: threads.count,
      messageThreadsKeptWithReplies: seededThreads.length - untouched.length,
      practitionerAdviceCleared: advice.count,
      clinicalMeasuresCleared: measures.count,
      brushingWeeksCleared: brushing.count,
      pointsAndStreaksReset: points.count,
      financingApprovalsDeleted: financing.count,
    };
  });
}
