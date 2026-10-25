// Decides whether prisma/seed.ts may run and which demo password it uses.
// The seed creates admin, clinician and operator accounts, so one mistaken
// run against a deployed database must not create known-password accounts.

const LOCAL_ENVS = ["development", "test"];
const LOCAL_DEFAULT_PASSWORD = "Password123!";
// Hosts that can only be this machine or the docker-compose database.
const LOCAL_DB_HOSTS = ["localhost", "127.0.0.1", "::1", "postgres"];

/**
 * The host DATABASE_URL points at, or null when it's unset or unreadable.
 * Unreadable counts as remote: the guard must fail closed.
 */
export function databaseHost(url: string | undefined): string | null | undefined {
  if (!url?.trim()) return undefined;
  try {
    return new URL(url.trim()).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch {
    return null;
  }
}

export interface SeedPlan {
  /**
   * "reference" seeds only clinics, services and the van with its service
   * area (plus default hours); "demo" also adds demo accounts, a patient's
   * clinical record and bookings (CS-12, SD-2).
   */
  scope: "reference" | "demo";
  demoPassword: string;
  /** Only print the password when it's the well-known local default. */
  printPassword: boolean;
}

export function planSeed(source: Record<string, string | undefined>): SeedPlan {
  const nodeEnv = source.NODE_ENV?.trim() ?? "";
  const configured = source.SEED_DEMO_PASSWORD?.trim();
  // NODE_ENV describes the machine running the seed, not the database it
  // writes to: a laptop in development can point DATABASE_URL at the test
  // environment. Both must be local.
  const host = databaseHost(source.DATABASE_URL);
  const localDatabase = host === undefined || (host !== null && LOCAL_DB_HOSTS.includes(host));
  const referenceOnly = source.SEED_SCOPE === "reference" || source.ALLOW_SEED === "reference";

  if (LOCAL_ENVS.includes(nodeEnv) && localDatabase) {
    const scope = referenceOnly ? "reference" : "demo";
    return configured
      ? { scope, demoPassword: configured, printPassword: false }
      : { scope, demoPassword: LOCAL_DEFAULT_PASSWORD, printPassword: true };
  }

  // Reference data creates no accounts, so a deployed database may take it on
  // an explicit ALLOW_SEED=reference, with no password involved.
  if (source.ALLOW_SEED === "reference") {
    return { scope: "reference", demoPassword: "", printPassword: false };
  }

  // Anything else (staging, production, unset, misspelt, or a remote
  // database) is treated as deployed: refuse unless explicitly asked for demo
  // data, and never with the published default password.
  if (source.ALLOW_SEED !== "demo") {
    const target = localDatabase ? `NODE_ENV="${nodeEnv}"` : `a database at "${host ?? "an unreadable DATABASE_URL"}"`;
    throw new Error(
      `Refusing to seed with ${target}. The seed creates demo staff accounts; ` +
        "set ALLOW_SEED=reference for clinics and services only, or ALLOW_SEED=demo and SEED_DEMO_PASSWORD " +
        "to add demo accounts to a non-local database on purpose."
    );
  }
  if (!configured || configured.length < 12 || configured === LOCAL_DEFAULT_PASSWORD) {
    throw new Error("SEED_DEMO_PASSWORD must be set to a unique password of at least 12 characters");
  }
  return { scope: "demo", demoPassword: configured, printPassword: false };
}
