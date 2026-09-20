import { DentalService, ClinicLocation, Clinician, TimeSlot } from "../features/booking/booking-types";

// ─── Dental Catalog Seed Data ────────────────────────────────────────────────
export const mockServices: DentalService[] = [
  {
    id: "srv_checkup",
    name: "Comprehensive Examination & 2 X-Rays",
    category: "checkup",
    description: "Thorough 14-point oral health, gum & cancer screening plus low-radiation digital bitewing radiographs.",
    durationMinutes: 30,
    pricePence: 6500, // £65.00
    depositPence: 2000, // £20.00
    prepInstructions: ["Brush teeth 30 mins before arrival", "Bring current medication list"],
    supportedChannels: ["clinic", "van"],
  },
  {
    id: "srv_hygiene",
    name: "AirFlow® Stain Removal & Hygiene",
    category: "hygiene",
    description: "Gentle ultrasonic calculus removal followed by high-pressure warm water & bicarbonate stain polishing.",
    durationMinutes: 45,
    pricePence: 8500, // £85.00
    depositPence: 2500, // £25.00
    supportedChannels: ["clinic", "van"],
  },
  {
    id: "srv_video_triage",
    name: "Emergency Video Triage & E-Prescription",
    category: "emergency",
    description: "Urgent 15-min live consultation for acute toothache, broken crown, or swelling with instant antibiotic/pain relief routing.",
    durationMinutes: 15,
    pricePence: 3500, // £35.00
    depositPence: 3500, // £35.00
    supportedChannels: ["video"],
  },
  {
    id: "srv_whitening",
    name: "Enlighten® Evolution Teeth Whitening",
    category: "cosmetic",
    description: "Guaranteed B1 shade result with custom-moulded lab trays and 2-week home gel kit + in-clinic booster.",
    durationMinutes: 45,
    pricePence: 49500, // £495.00
    depositPence: 10000, // £100.00
    requiresPriorConsult: true,
    supportedChannels: ["clinic"],
  },
  {
    id: "srv_filling",
    name: "Composite Tooth-Coloured Filling",
    category: "restorative",
    description: "Mercury-free resin restoration matched precisely to your natural tooth enamel shade.",
    durationMinutes: 45,
    pricePence: 12000, // £120.00
    depositPence: 3000, // £30.00
    supportedChannels: ["clinic", "van"],
  },
];

export const mockClinics: ClinicLocation[] = [
  {
    id: "cln_central",
    name: "Pav Dental Central Practice",
    address: "14 Harley Street, Marylebone",
    postcode: "W1G 9PQ",
    city: "London",
    phone: "020 7946 0123",
    operatingHours: "Mon–Fri: 08:00 – 19:00, Sat: 09:00 – 16:00",
  },
  {
    id: "cln_canary",
    name: "Pav Dental Canary Wharf",
    address: "25 Bank Street, Level 2",
    postcode: "E14 5JP",
    city: "London",
    phone: "020 7946 0456",
    operatingHours: "Mon–Fri: 07:30 – 19:30",
  },
];

export const mockClinicians: Clinician[] = [
  {
    id: "doc_tariq",
    fullName: "Dr. Tariq Pav",
    gdcNumber: "248912",
    roleTitle: "Clinical Director & Implant Surgeon",
    specialisms: ["Implantology", "Invisalign", "Sedation"],
    bio: "Over 14 years clinical experience across London teaching hospitals and private surgeries.",
    clinicIds: ["cln_central", "cln_canary"],
  },
  {
    id: "doc_sarah",
    fullName: "Dr. Sarah Jenkins",
    gdcNumber: "281034",
    roleTitle: "General Dental Practitioner",
    specialisms: ["Aesthetic Restorations", "Endodontics", "Anxious Patients"],
    bio: "Special interest in minimally invasive dentistry and nervous patient care.",
    clinicIds: ["cln_central"],
  },
  {
    id: "hyg_elena",
    fullName: "Elena Rostova",
    gdcNumber: "194022",
    roleTitle: "Dental Hygienist & Therapist",
    specialisms: ["Periodontal Therapy", "AirFlow Polishing", "Preventative Care"],
    bio: "Passionate about gentle gum health preservation and dental maintenance.",
    clinicIds: ["cln_central", "cln_canary"],
  },
];

export const mockSlots: TimeSlot[] = [
  {
    id: "s1",
    clinicianId: "doc_tariq",
    clinicId: "cln_central",
    startTimeUtc: "2026-09-22T09:00:00Z",
    endTimeUtc: "2026-09-22T09:30:00Z",
    displayTime: "09:00",
    dateFormatted: "Mon 22 Sep",
    channel: "clinic",
    isAvailable: true,
  },
  {
    id: "s2",
    clinicianId: "doc_tariq",
    clinicId: "cln_central",
    startTimeUtc: "2026-09-22T10:00:00Z",
    endTimeUtc: "2026-09-22T10:30:00Z",
    displayTime: "10:00",
    dateFormatted: "Mon 22 Sep",
    channel: "clinic",
    isAvailable: true,
  },
  {
    id: "s3",
    clinicianId: "doc_sarah",
    clinicId: "cln_central",
    startTimeUtc: "2026-09-22T11:30:00Z",
    endTimeUtc: "2026-09-22T12:00:00Z",
    displayTime: "11:30",
    dateFormatted: "Mon 22 Sep",
    channel: "clinic",
    isAvailable: true,
  },
  {
    id: "s4",
    clinicianId: "doc_tariq",
    clinicId: "cln_central",
    startTimeUtc: "2026-09-22T14:00:00Z",
    endTimeUtc: "2026-09-22T14:30:00Z",
    displayTime: "14:00",
    dateFormatted: "Mon 22 Sep",
    channel: "clinic",
    isAvailable: true,
  },
  {
    id: "s5",
    clinicianId: "doc_sarah",
    clinicId: "cln_central",
    startTimeUtc: "2026-09-23T10:00:00Z",
    endTimeUtc: "2026-09-23T10:30:00Z",
    displayTime: "10:00",
    dateFormatted: "Tue 23 Sep",
    channel: "clinic",
    isAvailable: true,
  },
  {
    id: "s6",
    clinicianId: "doc_sarah",
    clinicId: "cln_central",
    startTimeUtc: "2026-09-23T15:30:00Z",
    endTimeUtc: "2026-09-23T16:00:00Z",
    displayTime: "15:30",
    dateFormatted: "Tue 23 Sep",
    channel: "clinic",
    isAvailable: true,
  },
];

// Helper to format pence to GBP string
export function formatGbp(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

