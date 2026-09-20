export type ToothCondition =
  | "healthy"
  | "decay"
  | "filling"
  | "crown"
  | "missing";

export interface ToothRecord {
  id: string;
  patientId: string;
  toothNumber: number; // 1 to 32 (FDI / Universal numbering)
  quadrant: string;
  surfaces: {
    mesial?: ToothCondition;
    distal?: ToothCondition;
    occlusal?: ToothCondition;
    buccal?: ToothCondition;
    lingual?: ToothCondition;
  };
  notes?: string;
  updatedAt: string;
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
