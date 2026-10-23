// Helpers for writing logs that never carry patient data or credentials.
// Logs leave the clinical boundary (log drains, error trackers, terminals), so
// log identifiers and shapes, never values.

/** j***@example.com: enough to tell recipients apart while debugging. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 1) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/** ***1234: last four digits only. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-4)}` : "***";
}

const PATTERNS: [RegExp, string][] = [
  [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]"],
  [/\b(?:Bearer\s+)?eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[token]"],
  [/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]+/g, "[key]"],
  [/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi, "[postcode]"],
  [/(?:\+44\s?|\b0)(?:\d\s?){9,10}\b/g, "[phone]"],
  [/\b\d{3}\s?\d{3}\s?\d{4}\b/g, "[number]"],
];

/** Replaces emails, tokens, keys, postcodes and phone or NHS-style numbers. */
export function scrubText(text: string): string {
  return PATTERNS.reduce((out, [pattern, label]) => out.replace(pattern, label), text);
}

/**
 * An error reduced to fields that are safe to log. Prisma error messages can
 * quote the values a query was called with (names, notes, emails), so for
 * those only the class name and error code are kept, and the stack loses its
 * message line.
 */
export function safeError(err: unknown): { name: string; code?: string; message?: string; stack?: string } {
  if (!(err instanceof Error)) return { name: typeof err };
  const code = typeof (err as any).code === "string" ? (err as any).code : undefined;
  if (err.name.startsWith("PrismaClient")) {
    const frames = err.stack?.split("\n").filter((line) => line.trimStart().startsWith("at ")).join("\n");
    return { name: err.name, code, stack: frames };
  }
  return { name: err.name, code, message: scrubText(err.message), stack: err.stack && scrubText(err.stack) };
}
