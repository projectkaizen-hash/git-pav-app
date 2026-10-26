import type { OpeningHoursRow } from "./uk-time";

// ─── Dental Service Catalogue Models ──────────────────────────────────────────
export type CareChannel = "clinic" | "van" | "video";

export interface DentalService {
  id: string;
  name: string;
  category: "checkup" | "hygiene" | "emergency" | "cosmetic" | "restorative";
  description: string;
  durationMinutes: number;
  pricePence: number;
  depositPence: number;
  prepInstructions?: string[];
  requiresPriorConsult?: boolean;
  supportedChannels: CareChannel[];
}

export interface ClinicLocation {
  id: string;
  name: string;
  address: string;
  postcode: string;
  city: string;
  phone: string;
  imageUri?: string;
  /** Free-text summary; openingHours is what slots are built from. */
  operatingHours: string;
  openingHours?: OpeningHoursRow[];
}

export interface Clinician {
  id: string;
  fullName: string;
  gdcNumber: string;
  roleTitle: string; // e.g., "Principal Dental Surgeon", "Dental Hygienist"
  specialisms: string[];
  /** https link or uploaded image, set on the dashboard's Dentist profiles page. */
  photoUrl?: string | null;
  clinicIds?: string[];
  bio: string | null;
  isTelehealthActive?: boolean;
}

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

