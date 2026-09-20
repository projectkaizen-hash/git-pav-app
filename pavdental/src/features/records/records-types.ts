export type ToothCondition =
  | "healthy"
  | "decay"
  | "filled"
  | "missing"
  | "crown"
  | "implant"
  | "root_canal";

export interface ToothRecord {
  number: number; // 1 to 32 (FDI / Universal numbering)
  name: string;   // e.g., "Upper Right Third Molar", "Upper Central Incisor"
  arch: "upper" | "lower";
  quadrant: "UR" | "UL" | "LL" | "LR";
  condition: ToothCondition;
  notes?: string;
  treatmentDate?: string;
}

export interface TreatmentEstimateItem {
  id: string;
  code: string;
  description: string;
  toothNumber?: number;
  costPence: number;
  isAccepted: boolean;
}

export interface TreatmentPlan {
  id: string;
  title: string;
  clinicianName: string;
  createdAtFormatted: string;
  status: "pending_acceptance" | "in_progress" | "completed";
  items: TreatmentEstimateItem[];
  totalCostPence: number;
  patientSignedAt?: string;
}

export interface VaultDocument {
  id: string;
  type: "xray" | "prescription" | "referral" | "invoice";
  title: string;
  dateFormatted: string;
  fileSizeBytes: string;
  signedUrl: string; // Time-limited S3 signed URL
}
