import crypto from "crypto";
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { env } from "../config/env";

// Private prescriptions issued as signed PDFs (decisions log #4). The server
// freezes what was prescribed, for whom and by whom at issue time, signs that
// record with the practice's Ed25519 key, and renders the PDF from the frozen
// record, so a later change to a profile never changes an issued prescription.
//
// The seal shows the PDF came from Pav Dental unchanged. It is not the
// prescriber's own signature: the layout leaves a box for that, and whether a
// PDF can be dispensed without a wet or advanced electronic signature is a
// legal question that is still open.

export interface PrescriptionContent {
  version: 1;
  reference: string;
  issuedAt: string;
  // Age is required on a prescription for a child under 12.
  patient: { name: string; dob: string | null; ageUnder12: number | null; address: string | null };
  guardian: { name: string } | null;
  prescriber: { name: string; roleTitle: string; gdcNumber: string };
  practice: { name: string; address: string; phone: string | null };
  item: { medicine: string; directions: string; pharmacy: string };
}

export function newPrescriptionReference(): string {
  // 40 random bits in Crockford base32: short enough to read over the phone.
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = crypto.randomBytes(5);
  let bits = 0n;
  for (const b of bytes) bits = (bits << 8n) | BigInt(b);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out = alphabet[Number(bits & 31n)] + out;
    bits >>= 5n;
  }
  return `PAV-RX-${out.slice(0, 4)}-${out.slice(4)}`;
}

/** JSON with sorted keys, so the signed bytes don't depend on property order. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

let cachedKey: { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject; keyId: string } | null = null;

/**
 * The practice signing key. Deployed environments must set
 * PRESCRIPTION_SIGNING_KEY; development and test derive a fixed key so
 * signatures still verify across restarts. Returns null when none is set.
 */
export function prescriptionSigningKey() {
  if (cachedKey) return cachedKey;
  let privateKey: crypto.KeyObject;
  if (env.prescriptionSigningKey) {
    privateKey = crypto.createPrivateKey({
      key: Buffer.from(env.prescriptionSigningKey, "base64"),
      format: "der",
      type: "pkcs8",
    });
  } else if (env.isDevelopment || env.isTest) {
    // PKCS#8 wrapper for a raw Ed25519 seed.
    const seed = crypto.createHash("sha256").update("pavdental-dev-prescription-signing-key").digest();
    const prefix = Buffer.from("302e020100300506032b657004220420", "hex");
    privateKey = crypto.createPrivateKey({ key: Buffer.concat([prefix, seed]), format: "der", type: "pkcs8" });
  } else {
    return null;
  }
  const publicKey = crypto.createPublicKey(privateKey);
  const keyId = crypto
    .createHash("sha256")
    .update(publicKey.export({ format: "der", type: "spki" }))
    .digest("hex")
    .slice(0, 16);
  cachedKey = { privateKey, publicKey, keyId };
  return cachedKey;
}

export function signPrescription(content: PrescriptionContent): { signature: string; keyId: string } | null {
  const key = prescriptionSigningKey();
  if (!key) return null;
  const signature = crypto.sign(null, Buffer.from(canonicalJson(content)), key.privateKey).toString("base64");
  return { signature, keyId: key.keyId };
}

export function verifyPrescription(content: PrescriptionContent, signature: string): boolean {
  const key = prescriptionSigningKey();
  if (!key) return false;
  return crypto.verify(null, Buffer.from(canonicalJson(content)), key.publicKey, Buffer.from(signature, "base64"));
}

/** Short code printed on the PDF so staff can match it to the signed record. */
export function sealCode(signature: string): string {
  return crypto.createHash("sha256").update(signature).digest("hex").slice(0, 12).toUpperCase().match(/.{4}/g)!.join("-");
}

// The standard PDF fonts only cover Windows-1252, so anything else in a name
// or instruction is replaced rather than failing the whole document.
function printable(font: PDFFont, text: string): string {
  return [...text.normalize("NFC")]
    .map((ch) => {
      try {
        font.encodeText(ch);
        return ch;
      } catch {
        return "?";
      }
    })
    .join("");
}

function wrap(font: PDFFont, size: number, text: string, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}

export async function renderPrescriptionPdf(content: PrescriptionContent, signature: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Private prescription ${content.reference}`);
  pdf.setAuthor(content.practice.name);
  pdf.setCreationDate(new Date(content.issuedAt));
  pdf.setModificationDate(new Date(content.issuedAt));
  const page = pdf.addPage([595.28, 841.89]); // A4
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.06, 0.07);
  const muted = rgb(0.32, 0.32, 0.36);
  const margin = 56;
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  const text = (value: string, opts: { size?: number; font?: PDFFont; color?: typeof ink; x?: number } = {}) => {
    const size = opts.size ?? 11;
    const font = opts.font ?? regular;
    for (const line of wrap(font, size, printable(font, value), width - ((opts.x ?? margin) - margin))) {
      page.drawText(line, { x: opts.x ?? margin, y, size, font, color: opts.color ?? ink });
      y -= size * 1.4;
    }
  };
  const gap = (h = 10) => {
    y -= h;
  };
  const rule = () => {
    page.drawLine({ start: { x: margin, y }, end: { x: margin + width, y }, thickness: 0.5, color: muted });
    gap(14);
  };
  const field = (label: string, value: string) => {
    text(label.toUpperCase(), { size: 8, font: bold, color: muted });
    text(value);
    gap(4);
  };

  text("PRIVATE PRESCRIPTION", { size: 16, font: bold });
  text("For dental treatment only", { size: 10, color: muted });
  gap();
  text(content.practice.name, { font: bold });
  text(content.practice.address, { size: 10 });
  if (content.practice.phone) text(content.practice.phone, { size: 10 });
  gap();
  rule();

  field("Patient", content.patient.name);
  if (content.patient.dob) field("Date of birth", formatDate(content.patient.dob));
  if (content.patient.ageUnder12 !== null) field("Age", `${content.patient.ageUnder12} years`);
  field("Address", content.patient.address ?? "Not recorded");
  if (content.guardian) field("Parent or guardian", content.guardian.name);
  rule();

  field("Medicine", content.item.medicine);
  field("Directions", content.item.directions);
  field("Pharmacy", content.item.pharmacy);
  rule();

  field("Prescriber", `${content.prescriber.name}, ${content.prescriber.roleTitle}`);
  field("GDC number", content.prescriber.gdcNumber);
  field("Date issued", formatDate(content.issuedAt));
  gap(6);
  text("PRESCRIBER'S SIGNATURE", { size: 8, font: bold, color: muted });
  gap(28);
  page.drawLine({ start: { x: margin, y: y + 14 }, end: { x: margin + 240, y: y + 14 }, thickness: 0.75, color: ink });
  gap(8);
  rule();

  text(`Reference ${content.reference}   Seal ${sealCode(signature)}`, { size: 9, font: bold });
  text(
    "This document was issued and sealed electronically by the practice. Contact the practice to confirm the reference and seal before dispensing.",
    { size: 8, color: muted }
  );

  return pdf.save({ useObjectStreams: false });
}

// Opening the PDF in the phone's browser can't send the app's bearer token,
// so the app first asks for a link that works for five minutes.
const LINK_TTL_MS = 5 * 60 * 1000;

export function prescriptionDownloadToken(prescriptionId: string, now = Date.now()): string {
  const expires = now + LINK_TTL_MS;
  const mac = crypto.createHmac("sha256", env.jwtAccessSecret).update(`rx-pdf:${prescriptionId}:${expires}`).digest("base64url");
  return `${expires}.${mac}`;
}

export function checkPrescriptionDownloadToken(prescriptionId: string, token: string, now = Date.now()): boolean {
  const [expiresRaw, mac] = token.split(".");
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < now || !mac) return false;
  const expected = crypto.createHmac("sha256", env.jwtAccessSecret).update(`rx-pdf:${prescriptionId}:${expires}`).digest();
  const given = Buffer.from(mac, "base64url");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
