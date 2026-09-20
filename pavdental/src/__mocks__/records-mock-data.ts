import { ToothRecord, TreatmentPlan, VaultDocument } from "../features/records/records-types";

// ─── Default 32-Tooth Universal Baseline ─────────────────────────────────────
export const mockOdontogram: any[] = [
  // Upper Right (UR: 1 to 8)
  { number: 1, name: "UR Wisdom (18)", arch: "upper", quadrant: "UR", condition: "missing" },
  { number: 2, name: "UR Second Molar (17)", arch: "upper", quadrant: "UR", condition: "healthy" },
  { number: 3, name: "UR First Molar (16)", arch: "upper", quadrant: "UR", condition: "filled", notes: "Composite MOD" },
  { number: 4, name: "UR Second Premolar (15)", arch: "upper", quadrant: "UR", condition: "healthy" },
  { number: 5, name: "UR First Premolar (14)", arch: "upper", quadrant: "UR", condition: "healthy" },
  { number: 6, name: "UR Canine (13)", arch: "upper", quadrant: "UR", condition: "healthy" },
  { number: 7, name: "UR Lateral Incisor (12)", arch: "upper", quadrant: "UR", condition: "healthy" },
  { number: 8, name: "UR Central Incisor (11)", arch: "upper", quadrant: "UR", condition: "healthy" },

  // Upper Left (UL: 9 to 16)
  { number: 9, name: "UL Central Incisor (21)", arch: "upper", quadrant: "UL", condition: "healthy" },
  { number: 10, name: "UL Lateral Incisor (22)", arch: "upper", quadrant: "UL", condition: "healthy" },
  { number: 11, name: "UL Canine (23)", arch: "upper", quadrant: "UL", condition: "healthy" },
  { number: 12, name: "UL First Premolar (24)", arch: "upper", quadrant: "UL", condition: "healthy" },
  { number: 13, name: "UL Second Premolar (25)", arch: "upper", quadrant: "UL", condition: "healthy" },
  { number: 14, name: "UL First Molar (26)", arch: "upper", quadrant: "UL", condition: "crown", notes: "Zirconia Porcelain" },
  { number: 15, name: "UL Second Molar (27)", arch: "upper", quadrant: "UL", condition: "healthy" },
  { number: 16, name: "UL Wisdom (28)", arch: "upper", quadrant: "UL", condition: "missing" },

  // Lower Left (LL: 17 to 24)
  { number: 17, name: "LL Wisdom (38)", arch: "lower", quadrant: "LL", condition: "missing" },
  { number: 18, name: "LL Second Molar (37)", arch: "lower", quadrant: "LL", condition: "healthy" },
  { number: 19, name: "LL First Molar (36)", arch: "lower", quadrant: "LL", condition: "root_canal", notes: "Completed 2024" },
  { number: 20, name: "LL Second Premolar (35)", arch: "lower", quadrant: "LL", condition: "healthy" },
  { number: 21, name: "LL First Premolar (34)", arch: "lower", quadrant: "LL", condition: "healthy" },
  { number: 22, name: "LL Canine (33)", arch: "lower", quadrant: "LL", condition: "healthy" },
  { number: 23, name: "LL Lateral Incisor (32)", arch: "lower", quadrant: "LL", condition: "healthy" },
  { number: 24, name: "LL Central Incisor (31)", arch: "lower", quadrant: "LL", condition: "healthy" },

  // Lower Right (LR: 25 to 32)
  { number: 25, name: "LR Central Incisor (41)", arch: "lower", quadrant: "LR", condition: "healthy" },
  { number: 26, name: "LR Lateral Incisor (42)", arch: "lower", quadrant: "LR", condition: "healthy" },
  { number: 27, name: "LR Canine (43)", arch: "lower", quadrant: "LR", condition: "healthy" },
  { number: 28, name: "LR First Premolar (44)", arch: "lower", quadrant: "LR", condition: "healthy" },
  { number: 29, name: "LR Second Premolar (45)", arch: "lower", quadrant: "LR", condition: "healthy" },
  { number: 30, name: "LR First Molar (46)", arch: "lower", quadrant: "LR", condition: "filled" },
  { number: 31, name: "LR Second Molar (47)", arch: "lower", quadrant: "LR", condition: "decay", notes: "Needs composite restoration" },
  { number: 32, name: "LR Wisdom (48)", arch: "lower", quadrant: "LR", condition: "missing" },
];

export const mockTreatmentPlan: TreatmentPlan = {
  id: "plan_101",
  title: "Comprehensive Restorative & Gum Health Plan",
  clinicianName: "Dr. Tariq Pav (GDC #248912)",
  createdAtFormatted: "19 Sep 2026",
  status: "pending_acceptance",
  totalCostPence: 20500, // £205.00
  items: [
    {
      id: "it_1",
      code: "F31",
      description: "Composite White Resin Filling (Tooth LR7 / #31)",
      toothNumber: 31,
      costPence: 12000,
      isAccepted: true,
    },
    {
      id: "it_2",
      code: "HYG",
      description: "AirFlow Periodontal Therapy & Scale",
      costPence: 8500,
      isAccepted: true,
    },
  ],
};

export const mockDocuments: VaultDocument[] = [
  {
    id: "doc_1",
    type: "xray",
    title: "Digital Bitewing Radiograph (Right Quadrant)",
    dateFormatted: "19 Sep 2026",
    fileSizeBytes: "2.4 MB",
    signedUrl: "https://vault.pavdental.co.uk/xrays/bw_right.dcm",
  },
  {
    id: "doc_2",
    type: "prescription",
    title: "Electronic Prescription (Amoxicillin 500mg)",
    dateFormatted: "19 Sep 2026",
    fileSizeBytes: "142 KB",
    signedUrl: "https://vault.pavdental.co.uk/rx/amox_500.pdf",
  },
  {
    id: "doc_3",
    type: "invoice",
    title: "VAT Clinical Call-Out Invoice #INV-2026-089",
    dateFormatted: "19 Sep 2026",
    fileSizeBytes: "84 KB",
    signedUrl: "https://vault.pavdental.co.uk/invoices/inv_089.pdf",
  },
];
