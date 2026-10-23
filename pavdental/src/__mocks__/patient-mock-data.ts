// ─── Patient-side demo data for screens without backend endpoints yet ─────────
// Prototype-only: messages, prescriptions, insurance, check-in tasks,
// and provider reviews. Clearly labelled DEMO in the UI where used.
// Mirrors the shape of existing __mocks__ modules (booking / records).

// ─── Secure messages (MyChart-style inbox) ────────────────────────────────────
export interface DemoMessage {
  id: string;
  from: string;
  role: string;
  subject: string;
  preview: string;
  sentAtIso: string;
  isRead: boolean;
  hasAttachment: boolean;
}

export const mockMessages: DemoMessage[] = [
  {
    id: "msg_001",
    from: "Dr Priya Nair",
    role: "Dentist",
    subject: "Your X-ray results",
    preview:
      "Good news — the filling on your lower left molar has bonded well. No further treatment needed at this stage.",
    sentAtIso: "2026-09-29T09:12:00Z",
    isRead: false,
    hasAttachment: true,
  },
  {
    id: "msg_002",
    from: "Pav Dental Reception",
    role: "Practice",
    subject: "Appointment reminder — Hygiene visit",
    preview:
      "This is a reminder of your hygiene appointment next Tuesday at 14:30. Reply CANCEL to release the slot.",
    sentAtIso: "2026-09-28T16:40:00Z",
    isRead: false,
    hasAttachment: false,
  },
  {
    id: "msg_003",
    from: "Smile Team",
    role: "Treatment Co-ordinator",
    subject: "Your whitening plan quote",
    preview:
      "Your 14-day whitening plan is ready to review. The plan covers impressions, trays and three gel syringes.",
    sentAtIso: "2026-09-26T11:05:00Z",
    isRead: true,
    hasAttachment: true,
  },
  {
    id: "msg_004",
    from: "Pav Dental Billing",
    role: "Practice",
    subject: "Receipt for consultation",
    preview: "Your receipt for the 21 September examination is available to download.",
    sentAtIso: "2026-09-21T10:30:00Z",
    isRead: true,
    hasAttachment: true,
  },
];

// ─── Prescriptions ─────────────────────────────────────────────────────────────
export interface DemoPrescription {
  id: string;
  drugName: string;
  strength: string;
  form: "Tablets" | "Capsules" | "Gel" | "Mouthwash";
  dosage: string;
  course: string;
  prescriber: string;
  issuedIso: string;
  status: "active" | "completed";
  pharmacy: string;
  notes: string;
  refillsRemaining: number;
}

export const mockPrescriptions: DemoPrescription[] = [
  {
    id: "rx_001",
    drugName: "Amoxicillin",
    strength: "500 mg",
    form: "Capsules",
    dosage: "1 capsule three times a day",
    course: "5-day course",
    prescriber: "Dr Priya Nair (GDC #204518)",
    issuedIso: "2026-09-27T14:00:00Z",
    status: "active",
    pharmacy: "Boots Pharmacy — High Street",
    notes: "Take with food. Complete the full course even if you feel better.",
    refillsRemaining: 0,
  },
  {
    id: "rx_002",
    drugName: "Chlorhexidine",
    strength: "0.2%",
    form: "Mouthwash",
    dosage: "Rinse 10 ml twice daily",
    course: "14-day course",
    prescriber: "Dr Marcus Bell (GDC #198043)",
    issuedIso: "2026-09-20T09:30:00Z",
    status: "active",
    pharmacy: "Dispensed in practice",
    notes: "Do not use within 30 minutes of brushing. Avoid eating or drinking for 1 hour after rinsing.",
    refillsRemaining: 1,
  },
  {
    id: "rx_003",
    drugName: "Ibuprofen",
    strength: "400 mg",
    form: "Tablets",
    dosage: "1 tablet every 6 hours as needed",
    course: "3-day course",
    prescriber: "Dr Priya Nair (GDC #204518)",
    issuedIso: "2026-08-11T16:20:00Z",
    status: "completed",
    pharmacy: "Superdrug Pharmacy — Riverside",
    notes: "Take after food. Maximum 3 tablets in 24 hours.",
    refillsRemaining: 0,
  },
];

// ─── Insurance / payment cards ────────────────────────────────────────────────
export interface DemoInsuranceCard {
  id: string;
  insurer: string;
  policyNumber: string;
  memberSince: string;
  coverSummary: string;
}

export const mockInsuranceCards: DemoInsuranceCard[] = [
  {
    id: "ins_001",
    insurer: "Denplan Essentials",
    policyNumber: "DP •••• 4471",
    memberSince: "2024",
    coverSummary: "2 checkups + 2 hygiene visits per year · 15% off treatments",
  },
];

// ─── Pre-visit check-in tasks (Mobbin Zocdoc checklist pattern) ───────────────
export interface DemoCheckInTask {
  id: string;
  title: string;
  description: string;
  kind: "form" | "consent" | "balance" | "insurance";
  minutes: number;
}

export const mockCheckInTasks: DemoCheckInTask[] = [
  {
    id: "task_001",
    title: "Confirm medical history",
    description: "Review medications, allergies and conditions — 2 min.",
    kind: "form",
    minutes: 2,
  },
  {
    id: "task_002",
    title: "Sign treatment consent",
    description: "Digital consent for today's examination and X-rays.",
    kind: "consent",
    minutes: 1,
  },
  {
    id: "task_003",
    title: "Update insurance card",
    description: "Scan or confirm your current policy so claims go through first time.",
    kind: "insurance",
    minutes: 1,
  },
  {
    id: "task_004",
    title: "Settle £20.00 balance",
    description: "Remaining balance from your last hygiene visit.",
    kind: "balance",
    minutes: 1,
  },
];

// ─── Provider profile reviews (Zocdoc provider page pattern) ──────────────────
export interface DemoReview {
  id: string;
  author: string;
  rating: number; // 1–5
  dateIso: string;
  comment: string;
}

export const mockProviderReviews: Record<string, DemoReview[]> = {
  default: [
    {
      id: "rev_001",
      author: "Sarah M.",
      rating: 5,
      dateIso: "2026-08-30T12:00:00Z",
      comment: "Explained every step of the root canal and kept me calm throughout. Best dentist I've visited.",
    },
    {
      id: "rev_002",
      author: "James O.",
      rating: 5,
      dateIso: "2026-07-14T12:00:00Z",
      comment: "Ran exactly on time, gentle hygienist work, and the reception team sorted my insurance in seconds.",
    },
    {
      id: "rev_003",
      author: "Amrit K.",
      rating: 4,
      dateIso: "2026-06-02T12:00:00Z",
      comment: "Great care. Waiting room was busy on a Saturday but the appointment itself was thorough.",
    },
  ],
};
