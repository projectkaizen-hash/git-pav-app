import type { ApiCareChannel, ApiClinic, ApiClinician, ApiService } from "../api-contract.gen";

// ─── Dental Service Catalogue Models ──────────────────────────────────────────
// These are the API's own shapes, generated from the backend's contract
// (api-contract.gen.ts). Don't add fields here that the API doesn't send:
// add them to backend/src/contracts/app-api.ts and regenerate.
export type CareChannel = ApiCareChannel;
export type DentalService = ApiService;
export type ClinicLocation = ApiClinic;
export type Clinician = ApiClinician;

export interface TimeSlot {
  id: string;
  clinicianId: string;
  clinicId?: string;
  startTimeUtc: string; // ISO 8601 UTC
  endTimeUtc: string;   // ISO 8601 UTC
  displayTime: string;  // e.g., "10:30 AM"
  dateFormatted: string; // e.g., "Mon 22 Sep"
  channel: CareChannel;
  isAvailable: boolean;
}

export interface BookingSummary {
  serviceId: string;
  serviceName: string;
  channel: CareChannel;
  clinicId?: string;
  clinicName?: string;
  clinicianId: string;
  clinicianName: string;
  slotId: string;
  startTimeUtc: string;
  displayDateTime: string;
  totalPricePence: number;
  depositDuePence: number;
  cancellationPolicy: string;
}

