// Decides whether prisma/seed.ts may run and which demo password it uses.
// The seed creates admin, clinician and operator accounts, so one mistaken
// run against a deployed database must not create known-password accounts.

const LOCAL_ENVS = ["development", "test"];
const LOCAL_DEFAULT_PASSWORD = "Password123!";

export interface SeedPlan {
  demoPassword: string;
  /** Only print the password when it's the well-known local default. */
  printPassword: boolean;
}

export function planSeed(source: Record<string, string | undefined>): SeedPlan {
  const nodeEnv = source.NODE_ENV?.trim() ?? "";
  const configured = source.SEED_DEMO_PASSWORD?.trim();

  if (LOCAL_ENVS.includes(nodeEnv)) {
    return configured
      ? { demoPassword: configured, printPassword: false }
      : { demoPassword: LOCAL_DEFAULT_PASSWORD, printPassword: true };
  }

  // Anything else (staging, production, unset, misspelt) is treated as a
  // deployed database: refuse unless explicitly asked for demo data, and
  // never with the published default password.
  if (source.ALLOW_SEED !== "demo") {
    throw new Error(
      `Refusing to seed with NODE_ENV="${nodeEnv}". The seed creates demo staff accounts; ` +
        "set ALLOW_SEED=demo and SEED_DEMO_PASSWORD to seed a non-local database on purpose."
    );
  }
  if (!configured || configured.length < 12 || configured === LOCAL_DEFAULT_PASSWORD) {
    throw new Error("SEED_DEMO_PASSWORD must be set to a unique password of at least 12 characters");
  }
  return { demoPassword: configured, printPassword: false };
}
