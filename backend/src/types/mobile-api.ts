// Mobile API Types - Generated from backend response schemas
// This file can be copied to the mobile app or shared via a monorepo

export interface AuthUser {
  id: string;
  email: string;
  role: 'patient' | 'clinician' | 'operator' | 'admin';
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
}

export interface AuthSession {
  id: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  expiresAt: string;
}

export interface SessionListItem {
  id: string;
  deviceInfo: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  email: string | null;
  phone: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    postcode: string | null;
  };
  emergencyContact: {
    name: string | null;
    phone: string | null;
  };
  medicalHistory: string | null;
  consents: Record<string, string> | null;
}

export interface ToothRecord {
  id: string;
  patientId: string;
  toothNumber: number;
  arch: 'upper' | 'lower';
  quadrant: 'upper_right' | 'upper_left' | 'lower_right' | 'lower_left';
  condition: 'healthy' | 'decay' | 'filling' | 'crown' | 'bridge' | 'implant' | 'missing' | 'root_canal' | 'other';
  notes: string | null;
  updatedAt: string;
}

export interface TreatmentPlanItem {
  id: string;
  code: string;
  description: string;
  toothNumber: number | null;
  costPence: number;
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  clinicianId: string;
  title: string;
  totalCostPence: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  items: TreatmentPlanItem[];
  clinician: {
    fullName: string;
    roleTitle: string;
  };
}

export interface DocumentVault {
  id: string;
  patientId: string;
  docType: 'xray' | 'photo' | 'treatment_plan' | 'consent' | 'other';
  title: string;
  fileSizeBytes: number;
  createdAt: string;
  downloadUrl: string;
}

export interface Service {
  id: string;
  name: string;
  category: 'checkup' | 'hygiene' | 'emergency' | 'cosmetic' | 'restorative' | 'orthodontic';
  durationMinutes: number;
  pricePence: number;
  depositPence: number;
  description: string | null;
}

export interface Clinician {
  id: string;
  fullName: string;
  roleTitle: string;
  gdcNumber: string;
  photoUrl: string | null;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  postcode: string;
  phone: string | null;
}

export interface Slot {
  id: string;
  startTimeUtc: string;
  endTimeUtc: string;
  available: boolean;
  durationMinutes: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  clinicianId: string | null;
  serviceId: string;
  channel: 'clinic' | 'van' | 'video';
  clinicId: string | null;
  vanId: string | null;
  startTimeUtc: string;
  endTimeUtc: string;
  status: 'draft_hold' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  totalPricePence: number;
  depositPaidPence: number;
  holdExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  service: Service;
  clinician: Clinician | null;
  clinic: Clinic | null;
}

export interface SlotHoldResponse {
  success: boolean;
  slotId: string;
  holdExpiresAt: number;
  holdDurationSeconds: number;
  message: string;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amountPence: number;
  currency: string;
  status: string;
}

export interface RefundResponse {
  refundId: string;
  amountPence: number;
  status: string;
  refundPercentage: number;
}

export interface VanCoverage {
  isCovered: boolean;
  assignedVan: string | null;
  postcode: string;
  nextAvailableDate: string | null;
}

export interface VanStop {
  id: string;
  vanId: string;
  scheduledDate: string;
  address: string;
  postcode: string;
  patientName: string;
  procedure: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'missed';
  estimatedArrival: string | null;
  checkInTime: string | null;
  completionTime: string | null;
}

export interface VideoRoom {
  id: string;
  appointmentId: string;
  url: string;
  roomName: string;
  expiresAt: string;
  status: 'scheduled' | 'active' | 'ended';
}

export interface PushTokenRegistration {
  id: string;
  token: string;
  platform: 'ios' | 'android';
  registeredAt: string;
}

export interface WaitlistEntry {
  id: string;
  userId: string;
  serviceId: string;
  preferredDate: string;
  position: number;
  status: 'active' | 'notified' | 'cancelled' | 'fulfilled';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceId: string | null;
  resourceType: string | null;
  metadata: Record<string, unknown> | null;
  ipAddressHash: string | null;
  timestamp: string;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

export interface ApiError {
  error: string;
  requestId: string;
  timestamp: string;
}
