// Mobile van dispatch types

export type VanShiftStatus = "offline" | "online" | "paused";

export type VanRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "expired"
  | "cancelled"
  | "in_progress"
  | "completed"
  | "no_show";

export type VanStopPhase =
  | "queued"
  | "en_route"
  | "on_site"
  | "in_treatment"
  | "completed"
  | "cancelled";

export type VanAccessDetails = {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  lat: number;
  lng: number;
  parkingType: "private_driveway" | "permit_bay" | "visitor" | "other";
  gateCode?: string;
  accessNotes?: string;
};

export type VanShift = {
  id: string;
  vanId: string;
  operatorId: string;
  status: VanShiftStatus;
  startedAt: string;
  endedAt?: string | null;
  lastLat?: number | null;
  lastLng?: number | null;
  lastLocationAt?: string | null;
  van?: {
    id: string;
    name: string;
    registrationPlate: string;
  };
};

export type VanServiceRequest = {
  id: string;
  shiftId: string;
  vanId: string;
  patientId: string;
  serviceId: string;
  status: VanRequestStatus;
  phase: VanStopPhase;
  queuePosition?: number | null;
  patientLat: number;
  patientLng: number;
  accessDetails: VanAccessDetails;
  requestedAt: string;
  expiresAt: string;
  acceptedAt?: string | null;
  treatmentStartedAt?: string | null;
  completedAt?: string | null;
  etaSecondsSnapshot?: number | null;
  etaSeconds?: number | null;
  etaLabel?: string | null;
  notes?: string | null;
  service?: {
    name: string;
    durationMinutes: number;
  };
  patient?: {
    firstName: string;
    lastName: string;
  };
  van?: {
    name: string;
    registrationPlate: string;
  };
  shift?: {
    lastLat?: number | null;
    lastLng?: number | null;
    lastLocationAt?: string | null;
    status: VanShiftStatus;
  };
};

export type VanAvailability = {
  available: boolean;
  etaSeconds: number | null;
  etaLabel: string | null;
  queueLength: number;
  vanId: string | null;
  shiftId: string | null;
  message: string;
};

