import { create } from "zustand";
import { VanAvailability, VanAccessDetails } from "./van-types";

interface VanDispatchDraftState {
  // Location & Coverage
  postcode: string;
  lat: number;
  lng: number;
  isCovered: boolean;
  availability: VanAvailability | null;

  // Selected Service
  serviceId: string;
  serviceName: string;
  servicePricePence: number;
  serviceDurationMinutes: number;

  // Property & Parking Access
  addressLine1: string;
  addressLine2: string;
  city: string;
  parkingType: "private_driveway" | "permit_bay" | "visitor" | "other";
  gateCode: string;
  accessNotes: string;

  // Active Request
  activeRequestId: string | null;

  // Actions
  setLocationCoverage: (data: {
    postcode: string;
    lat: number;
    lng: number;
    isCovered: boolean;
    availability: VanAvailability | null;
  }) => void;
  setService: (data: {
    serviceId: string;
    serviceName: string;
    servicePricePence: number;
    serviceDurationMinutes: number;
  }) => void;
  setAccessDetails: (details: Partial<{
    addressLine1: string;
    addressLine2: string;
    city: string;
    parkingType: "private_driveway" | "permit_bay" | "visitor" | "other";
    gateCode: string;
    accessNotes: string;
  }>) => void;
  setActiveRequestId: (id: string | null) => void;
  getAccessDetailsPayload: () => VanAccessDetails;
  resetDraft: () => void;
}

export const useVanStore = create<VanDispatchDraftState>((set, get) => ({
  postcode: "",
  lat: 51.5074,
  lng: -0.1278,
  isCovered: false,
  availability: null,

  serviceId: "srv_checkup",
  serviceName: "Routine Examination & Oral Health Check",
  servicePricePence: 8500,
  serviceDurationMinutes: 45,

  addressLine1: "",
  addressLine2: "",
  city: "London",
  parkingType: "private_driveway",
  gateCode: "",
  accessNotes: "",

  activeRequestId: null,

  setLocationCoverage: (data) => set((state) => ({ ...state, ...data })),
  setService: (data) => set((state) => ({ ...state, ...data })),
  setAccessDetails: (details) => set((state) => ({ ...state, ...details })),
  setActiveRequestId: (id) => set({ activeRequestId: id }),
  getAccessDetailsPayload: () => {
    const s = get();
    return {
      addressLine1: s.addressLine1 || "10 Downing Street",
      addressLine2: s.addressLine2 || undefined,
      city: s.city || "London",
      postcode: s.postcode || "SW1A 2AA",
      lat: s.lat,
      lng: s.lng,
      parkingType: s.parkingType,
      gateCode: s.gateCode || undefined,
      accessNotes: s.accessNotes || undefined,
    };
  },
  resetDraft: () =>
    set({
      postcode: "",
      lat: 51.5074,
      lng: -0.1278,
      isCovered: false,
      availability: null,
      serviceId: "srv_checkup",
      serviceName: "Routine Examination & Oral Health Check",
      servicePricePence: 8500,
      serviceDurationMinutes: 45,
      addressLine1: "",
      addressLine2: "",
      city: "London",
      parkingType: "private_driveway",
      gateCode: "",
      accessNotes: "",
      activeRequestId: null,
    }),
}));

