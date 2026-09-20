/**
 * Shared API Type Definitions
 * 
 * Centralized type definitions for API requests and responses.
 * These types are shared between backend and mobile app to ensure type safety
 * and eliminate "any" types in the codebase.
 * 
 * This file should be the single source of truth for API contracts.
 * When updated, both backend and mobile should reference these types.
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthUser {
  sub: string;
  role: 'patient' | 'clinician' | 'operator' | 'admin';
  email: string;
  emailVerified: boolean;
  isMfaEnabled: boolean;
  profileId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'patient' | 'clinician' | 'operator';
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ============================================================================
// Patient Profile Types
// ============================================================================

export interface PatientProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dob?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  medicalHistory?: unknown;
  consents?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePatientProfileRequest {
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
}

// ============================================================================
// Clinician Profile Types
// ============================================================================

export interface ClinicianProfile {
  id: string;
  userId: string;
  fullName: string;
  gdcNumber: string;
  roleTitle: string;
  specialisms: string[];
  bio?: string;
  photoUrl?: string;
  isTelehealthActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Service Catalog Types
// ============================================================================

export interface Service {
  id: string;
  name: string;
  category: 'checkup' | 'hygiene' | 'cosmetic' | 'emergency' | 'specialist';
  description: string;
  durationMinutes: number;
  pricePence: number;
  depositPence: number;
  supportedChannels: ('clinic' | 'mobile_van' | 'telehealth')[];
  prepInstructions: string[];
  requiresPriorConsult: boolean;
  isActive: boolean;
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  postcode: string;
  phone: string;
  isOpen: boolean;
  openingHours: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
}

// ============================================================================
// Appointment Types
// ============================================================================

export type AppointmentStatus = 
  | 'draft_hold'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired';

export type CareChannel = 'clinic' | 'mobile_van' | 'telehealth';

export interface Appointment {
  id: string;
  patientId: string;
  clinicianId?: string;
  serviceId: string;
  channel: CareChannel;
  clinicId?: string;
  vanId?: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: AppointmentStatus;
  holdExpiresAt?: string;
  accessDetails?: unknown;
  triageData?: unknown;
  intraoralPhotos: string[];
  totalPricePence: number;
  depositPaidPence: number;
  stripePaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  serviceId: string;
  channel: CareChannel;
  clinicId?: string;
  vanId?: string;
  startTimeUtc: string;
  triageData?: unknown;
}

export interface HoldSlotRequest {
  serviceId: string;
  channel: CareChannel;
  clinicId?: string;
  vanId?: string;
  startTimeUtc: string;
}

// ============================================================================
// Triage Types
// ============================================================================

export interface TriageData {
  symptoms: string[];
  painLevel: number;
  duration: string;
  swelling?: boolean;
  bleeding?: boolean;
  fever?: boolean;
  difficultyBreathing?: boolean;
  difficultySwallowing?: boolean;
  traumaHistory?: string;
}

export interface TriageCheckRequest {
  triageData: TriageData;
}

export interface TriageCheckResponse {
  isRedFlag: boolean;
  shouldBlockBooking: boolean;
  flagType?: string;
  emergencyInstructions?: string;
  emergencyNumber?: string;
}

// ============================================================================
// Video Consultation Types
// ============================================================================

export interface CreateVideoRoomRequest {
  appointmentId: string;
}

export interface VideoRoom {
  roomName: string;
  url: string;
  token?: string;
  expiresAt: string;
  isMock: boolean;
}

export interface SubmitTriageRequest {
  appointmentId: string;
  triageData: TriageData;
  notes?: string;
}

export interface AdmitPatientRequest {
  appointmentId: string;
  clinicianId: string;
}

// ============================================================================
// Prescription Types
// ============================================================================

export interface Prescription {
  id: string;
  appointmentId?: string;
  clinicianId: string;
  medicationName: string;
  dosageInstructions: string;
  dispensingPharmacy: string;
  epsTransactionRef?: string;
  dispatchedAt: string;
}

export interface CreatePrescriptionRequest {
  appointmentId?: string;
  medicationName: string;
  dosageInstructions: string;
  dispensingPharmacy: string;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface CreatePaymentIntentRequest {
  appointmentId: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  publishableKey: string;
  isMock: boolean;
}

// ============================================================================
// Consent Types
// ============================================================================

export type ConsentType =
  | 'data_processing'
  | 'telehealth'
  | 'data_sharing'
  | 'marketing'
  | 'clinical_records'
  | 'payment_processing';

export type LawfulBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';

export interface ConsentRecord {
  id: string;
  patientProfileId: string;
  consentType: ConsentType;
  version: number;
  isGranted: boolean;
  lawfulBasis: LawfulBasis;
  grantedAt?: string;
  withdrawnAt?: string;
  ipAddressHash?: string;
  createdAt: string;
}

export interface GrantConsentRequest {
  consentType: ConsentType;
  lawfulBasis: LawfulBasis;
}

export interface WithdrawConsentRequest {
  consentType: ConsentType;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface RegisterPushTokenRequest {
  token: string;
  deviceInfo?: string;
}

export interface NotificationPreferences {
  appointmentReminders: boolean;
  waitlistUpdates: boolean;
  promotions: boolean;
  clinicalUpdates: boolean;
}

export interface UpdateNotificationPreferencesRequest {
  preferences: NotificationPreferences;
}

// ============================================================================
// Document Vault Types
// ============================================================================

export interface DocumentVault {
  id: string;
  patientId: string;
  docType: 'xray' | 'prescription' | 'invoice';
  title: string;
  fileKey: string;
  fileSizeBytes: number;
  createdAt: string;
}

export interface SignedUrlResponse {
  url: string;
  expiresAt: string;
}

// ============================================================================
// Van Service Types
// ============================================================================

export interface Van {
  id: string;
  name: string;
  registrationPlate: string;
  vehicleModel: string;
  isActive: boolean;
  createdAt: string;
}

export interface VanServicePolygon {
  id: string;
  vanId: string;
  sectorName: string;
  polygonGeoJson: unknown;
  createdAt: string;
}

export interface CoverageCheckRequest {
  postcode: string;
}

export interface CoverageCheckResponse {
  isCovered: boolean;
  vanId?: string;
  sectorName?: string;
  nextAvailableSlots?: string[];
}

// ============================================================================
// Treatment Plan Types
// ============================================================================

export interface TreatmentPlan {
  id: string;
  patientId: string;
  clinicianId?: string;
  title: string;
  status: 'draft' | 'proposed' | 'accepted' | 'rejected' | 'completed';
  estimatedCostPence: number;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentPlanItem {
  id: string;
  treatmentPlanId: string;
  code: string;
  description: string;
  toothNumber?: number;
  costPence: number;
  isAccepted: boolean;
}

// ============================================================================
// Odontogram Types
// ============================================================================

export interface ToothRecord {
  id: string;
  patientId: string;
  toothNumber: number;
  surfaces: {
    mesial?: 'healthy' | 'decay' | 'filling' | 'crown' | 'missing';
    distal?: 'healthy' | 'decay' | 'filling' | 'crown' | 'missing';
    occlusal?: 'healthy' | 'decay' | 'filling' | 'crown' | 'missing';
    buccal?: 'healthy' | 'decay' | 'filling' | 'crown' | 'missing';
    lingual?: 'healthy' | 'decay' | 'filling' | 'crown' | 'missing';
  };
  notes?: string;
  updatedAt: string;
}

// ============================================================================
// Common Types
// ============================================================================

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
}
