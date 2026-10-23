// Turns a patient's stored medical history into what a clinician must see.
// Two shapes exist in the data: the profile form (arrays, `allergyDetails`,
// `isTakingMedications`) and onboarding (free text in `allergies` and
// `medications`, `isTakingMeds`). Both are read here.
//
// `null` always means "not recorded". It must never be shown as "none":
// a missing allergy record is not the same as no allergies.

export interface MedicalSummary {
  /** null = not recorded; [] = patient said no allergies. */
  allergies: string[] | null;
  /** null = not recorded; [] = patient said no medications. */
  medications: string[] | null;
  conditions: string[];
  bleedingRisk: boolean | null;
}

type Raw = Record<string, unknown> | null | undefined;

function splitList(value: unknown): string[] {
  const parts = Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : typeof value === "string"
      ? value.split(/[,;\n]/)
      : [];
  const seen = new Set<string>();
  return parts
    .map((p) => p.trim())
    .filter((p) => p && !seen.has(p.toLowerCase()) && seen.add(p.toLowerCase()));
}

function readList(raw: NonNullable<Raw>, flagKeys: string[], listKeys: string[]): string[] | null {
  const flag = flagKeys.map((k) => raw[k]).find((v) => typeof v === "boolean") as boolean | undefined;
  const items = splitList(listKeys.flatMap((k) => splitList(raw[k])));
  if (items.length > 0) return items;
  if (flag === false) return [];
  // Flagged yes with no detail, or no answer at all: we can't say what it is.
  return null;
}

export function summariseMedicalHistory(raw: Raw): MedicalSummary {
  if (!raw || typeof raw !== "object") {
    return { allergies: null, medications: null, conditions: [], bleedingRisk: null };
  }
  const allergies = readList(raw, ["hasAllergies"], ["allergies", "allergyDetails"]);
  // "Yes, allergic" with no detail still has to read as a warning, not as unknown.
  const flaggedAllergyWithoutDetail = raw.hasAllergies === true && allergies === null;
  return {
    allergies: flaggedAllergyWithoutDetail ? ["Allergy reported, details not recorded"] : allergies,
    medications: readList(raw, ["isTakingMedications", "isTakingMeds"], ["medications", "medicationDetails", "medDetails"]),
    conditions: splitList(raw.conditions),
    bleedingRisk: typeof raw.isBleedingRisk === "boolean" ? raw.isBleedingRisk : null,
  };
}

export function describeList(list: string[] | null, none: string): string {
  if (list === null) return "Not recorded";
  return list.length === 0 ? none : list.join(", ");
}
