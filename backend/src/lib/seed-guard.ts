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

  if (LOCAL_ENVS.includes(nodeEnv) && localDatabase) {
    return configured
      ? { demoPassword: configured, printPassword: false }
      : { demoPassword: LOCAL_DEFAULT_PASSWORD, printPassword: true };
  }

  // Anything else (staging, production, unset, misspelt, or a remote
  // database) is treated as deployed: refuse unless explicitly asked for demo
  // data, and never with the published default password.
  if (source.ALLOW_SEED !== "demo") {
    const target = localDatabase ? `NODE_ENV="${nodeEnv}"` : `a database at "${host ?? "an unreadable DATABASE_URL"}"`;
    throw new Error(
      `Refusing to seed with ${target}. The seed creates demo staff accounts; ` +
        "set ALLOW_SEED=demo and SEED_DEMO_PASSWORD to seed a non-local database on purpose."
    );
  }
  if (!configured || configured.length < 12 || configured === LOCAL_DEFAULT_PASSWORD) {
    throw new Error("SEED_DEMO_PASSWORD must be set to a unique password of at least 12 characters");
  }
  return { demoPassword: configured, printPassword: false };
}
