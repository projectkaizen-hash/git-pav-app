import { create } from "zustand";

/**
 * Draft state for the 4-step patient onboarding wizard
 * (profile → address → medical-history → consents).
 *
 * Each step saves its answers here; the final consent step persists
 * everything to the backend (consents via /api/consents/grant, profile via
 * /api/patients/:id/profile) before the wizard completes.
 */

export type OnboardingMedicalHistory = {
  hasAllergies: boolean;
  allergyDetails: string;
  isTakingMeds: boolean;
  medDetails: string;
  isBleedingRisk: boolean;
  gpSurgery: string;
};

export type OnboardingConsents = {
  /** Special-category health data — mandatory */
  dataProcessing: boolean;
  /** General treatment & examination — mandatory */
  treatmentConsent: boolean;
  /** Hygiene & recall reminders — optional */
  directMarketing: boolean;
};

export type OnboardingInsurance = {
  provider: string;
  policyNumber: string;
};

interface OnboardingDraftState {
  // Step 1: profile
  dob: string; // ISO YYYY-MM-DD
  gender: string; // backend enum value or ""
  emergencyContactName: string;
  emergencyContactPhone: string;

  // Step 2: address
  postcode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;

  // Step 3: insurance
  insurance: OnboardingInsurance | null;

  // Step 4: medical history
  medicalHistory: OnboardingMedicalHistory;

  // Step 5: consents
  consents: OnboardingConsents;

  setProfile: (data: {
    dob: string;
    gender: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  }) => void;
  setAddress: (data: {
    postcode: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
  }) => void;
  setInsurance: (data: OnboardingInsurance | null) => void;
  setMedicalHistory: (data: OnboardingMedicalHistory) => void;
  setConsents: (data: OnboardingConsents) => void;
  reset: () => void;
}

const initialMedicalHistory: OnboardingMedicalHistory = {
  hasAllergies: false,
  allergyDetails: "",
  isTakingMeds: false,
  medDetails: "",
  isBleedingRisk: false,
  gpSurgery: "",
};

const initialConsents: OnboardingConsents = {
  dataProcessing: false,
  treatmentConsent: false,
  directMarketing: false,
};

export const useOnboardingStore = create<OnboardingDraftState>((set) => ({
  dob: "",
  gender: "",
  emergencyContactName: "",
  emergencyContactPhone: "",

  postcode: "",
  addressLine1: "",
  addressLine2: "",
  city: "",

  insurance: null,

  medicalHistory: initialMedicalHistory,
  consents: initialConsents,

  setProfile: (data) => set((state) => ({ ...state, ...data })),
  setAddress: (data) => set((state) => ({ ...state, ...data })),
  setInsurance: (data) => set({ insurance: data }),
  setMedicalHistory: (data) => set({ medicalHistory: data }),
  setConsents: (data) => set({ consents: data }),
  reset: () =>
    set({
      dob: "",
      gender: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      postcode: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      insurance: null,
      medicalHistory: initialMedicalHistory,
      consents: initialConsents,
    }),
}));
