// Shapes and form checks for the team and services screen. The backend
// validates everything again; these checks only give staff a clear message
// before the request is sent.

export const SERVICE_CATEGORIES = ["checkup", "hygiene", "emergency", "restorative", "cosmetic"] as const;
export const CHANNELS = ["clinic", "van", "video"] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export type Channel = (typeof CHANNELS)[number];

export interface TeamClinician {
  id: string;
  fullName: string;
  roleTitle: string | null;
  isTelehealthActive: boolean;
}

export interface TeamService {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  pricePence: number;
  depositPence: number;
  supportedChannels: string[];
  isActive: boolean;
}

export interface TeamVan {
  id: string;
  name: string;
  registrationPlate: string;
  vehicleModel: string;
  isActive: boolean;
  assignments: { operator: { fullName: string } | null }[];
}

export interface StaffCreated {
  id: string;
  email: string;
  fullName: string;
  inviteSent: boolean;
}

type Result<T> = { ok: true; payload: T } | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "85" or "85.50" in pounds to pence; null for anything else. */
export function toPence(pounds: string): number | null {
  const value = pounds.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export const formatPounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

export function clinicianPayload(form: {
  email: string;
  fullName: string;
  gdcNumber: string;
  roleTitle: string;
  isTelehealthActive: boolean;
}): Result<{ email: string; fullName: string; gdcNumber: string; roleTitle: string; isTelehealthActive: boolean }> {
  const email = form.email.trim();
  const fullName = form.fullName.trim();
  const gdcNumber = form.gdcNumber.trim();
  const roleTitle = form.roleTitle.trim();
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email address" };
  if (fullName.length < 2) return { ok: false, error: "Enter the clinician's full name" };
  if (!/^\d{6}$/.test(gdcNumber)) return { ok: false, error: "The GDC number is 6 digits" };
  if (roleTitle.length < 2) return { ok: false, error: "Enter a role, for example Dentist" };
  return { ok: true, payload: { email, fullName, gdcNumber, roleTitle, isTelehealthActive: form.isTelehealthActive } };
}

export function operatorPayload(form: {
  email: string;
  fullName: string;
  phone: string;
}): Result<{ email: string; fullName: string; phone?: string }> {
  const email = form.email.trim();
  const fullName = form.fullName.trim();
  const phone = form.phone.trim();
  if (!EMAIL.test(email)) return { ok: false, error: "Enter a valid email address" };
  if (fullName.length < 2) return { ok: false, error: "Enter the operator's full name" };
  if (phone && phone.length < 5) return { ok: false, error: "Enter a full phone number, or leave it blank" };
  return { ok: true, payload: phone ? { email, fullName, phone } : { email, fullName } };
}

export function servicePayload(form: {
  name: string;
  category: ServiceCategory;
  durationMinutes: string;
  price: string;
  deposit: string;
  channels: Channel[];
}): Result<{
  name: string;
  category: ServiceCategory;
  durationMinutes: number;
  pricePence: number;
  depositPence: number;
  supportedChannels: Channel[];
}> {
  const name = form.name.trim();
  const durationMinutes = Number(form.durationMinutes);
  const pricePence = toPence(form.price);
  const depositPence = form.deposit.trim() === "" ? 0 : toPence(form.deposit);
  if (name.length < 2) return { ok: false, error: "Enter the service name" };
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
    return { ok: false, error: "The length is whole minutes, from 5 to 480" };
  }
  if (pricePence === null) return { ok: false, error: "Enter the price in pounds, for example 65 or 65.50" };
  if (depositPence === null) return { ok: false, error: "Enter the deposit in pounds, or leave it blank for none" };
  if (depositPence > pricePence) return { ok: false, error: "The deposit can't be more than the price" };
  if (form.channels.length === 0) return { ok: false, error: "Choose at least one way to book it" };
  return {
    ok: true,
    payload: { name, category: form.category, durationMinutes, pricePence, depositPence, supportedChannels: form.channels },
  };
}

export function vanPayload(form: {
  name: string;
  registrationPlate: string;
  vehicleModel: string;
}): Result<{ name: string; registrationPlate: string; vehicleModel: string }> {
  const name = form.name.trim();
  const registrationPlate = form.registrationPlate.trim().toUpperCase();
  const vehicleModel = form.vehicleModel.trim();
  if (name.length < 2) return { ok: false, error: "Enter a name for the van" };
  if (registrationPlate.length < 2) return { ok: false, error: "Enter the registration plate" };
  if (vehicleModel.length < 2) return { ok: false, error: "Enter the vehicle model" };
  return { ok: true, payload: { name, registrationPlate, vehicleModel } };
}
