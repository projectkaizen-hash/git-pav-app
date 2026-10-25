import { spawnSync } from "child_process";
import path from "path";
import { planSeed } from "../lib/seed-guard";

describe("planSeed", () => {
  it("seeds reference data only when asked, locally or on a deployed database (CS-12)", () => {
    expect(planSeed({ NODE_ENV: "development", SEED_SCOPE: "reference" }).scope).toBe("reference");
    expect(planSeed({ NODE_ENV: "development" }).scope).toBe("demo");
    const remote = "postgresql://u:p@db.example.test:5432/pav";
    for (const NODE_ENV of ["staging", "production", "development"]) {
      expect(planSeed({ NODE_ENV, DATABASE_URL: remote, ALLOW_SEED: "reference" })).toEqual({
        scope: "reference",
        demoPassword: "",
        printPassword: false,
      });
    }
    // SEED_SCOPE alone doesn't unlock a deployed database.
    expect(() => planSeed({ NODE_ENV: "staging", SEED_SCOPE: "reference" })).toThrow(/Refusing to seed/);
  });

  it("uses the well-known local password in development and test", () => {
    expect(planSeed({ NODE_ENV: "development" })).toEqual({ scope: "demo", demoPassword: "Password123!", printPassword: true });
    expect(planSeed({ NODE_ENV: "test" }).demoPassword).toBe("Password123!");
  });

  it("uses SEED_DEMO_PASSWORD locally when set, without printing it", () => {
    expect(planSeed({ NODE_ENV: "development", SEED_DEMO_PASSWORD: "local-only-pass" })).toEqual({
      scope: "demo",
      demoPassword: "local-only-pass",
      printPassword: false,
    });
  });

  it.each(["production", "staging", "", "prod", undefined])("refuses NODE_ENV=%p without ALLOW_SEED=demo", (nodeEnv) => {
    expect(() => planSeed({ NODE_ENV: nodeEnv, SEED_DEMO_PASSWORD: "a-long-unique-password" })).toThrow(
      /Refusing to seed/
    );
  });

  it("refuses demo seeding of a deployed database with a missing, short or published password", () => {
    for (const password of [undefined, "short", "Password123!"]) {
      expect(() =>
        planSeed({ NODE_ENV: "staging", ALLOW_SEED: "demo", SEED_DEMO_PASSWORD: password })
      ).toThrow(/SEED_DEMO_PASSWORD/);
    }
  });

  it("uses the local password for a local database, whichever local host name it uses", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]", "postgres"]) {
      const DATABASE_URL = `postgresql://pavdental:x@${host}:5432/pav?schema=public`;
      expect(planSeed({ NODE_ENV: "development", DATABASE_URL }).demoPassword).toBe("Password123!");
    }
  });

  it("refuses a remote or unreadable DATABASE_URL in development without ALLOW_SEED=demo", () => {
    for (const DATABASE_URL of [
      "postgresql://u:p@db.abcdefgh.supabase.example.test:5432/postgres",
      "postgresql://u:p@10.0.0.5:5432/pav",
      "not a url",
    ]) {
      expect(() => planSeed({ NODE_ENV: "development", DATABASE_URL })).toThrow(/Refusing to seed/);
    }
  });

  it("never uses the published password for a remote database, even in development", () => {
    const DATABASE_URL = "postgresql://u:p@db.abcdefgh.supabase.example.test:5432/postgres";
    expect(() => planSeed({ NODE_ENV: "development", DATABASE_URL, ALLOW_SEED: "demo" })).toThrow(
      /SEED_DEMO_PASSWORD/
    );
    expect(
      planSeed({ NODE_ENV: "development", DATABASE_URL, ALLOW_SEED: "demo", SEED_DEMO_PASSWORD: "a-long-unique-password" })
    ).toEqual({ scope: "demo", demoPassword: "a-long-unique-password", printPassword: false });
  });

  it("allows an explicit demo seed with a unique password", () => {
    expect(
      planSeed({ NODE_ENV: "staging", ALLOW_SEED: "demo", SEED_DEMO_PASSWORD: "a-long-unique-password" })
    ).toEqual({ scope: "demo", demoPassword: "a-long-unique-password", printPassword: false });
  });
});

describe("prisma/seed.ts", () => {
  jest.setTimeout(60_000);

  it("exits before touching the database when NODE_ENV=production", () => {
    const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      cwd: path.resolve(__dirname, "../.."),
      // An unreachable database: if the guard didn't stop it first, the
      // failure would be a connection error instead of the refusal.
      env: { ...process.env, NODE_ENV: "production", DATABASE_URL: "postgresql://nobody@127.0.0.1:1/none" },
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/Refusing to seed/);
    expect(result.stdout).not.toContain("Seeding");
  });

  it("exits before touching the database when DATABASE_URL is remote, even in development", () => {
    const result = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
      cwd: path.resolve(__dirname, "../.."),
      // A reserved, unreachable name: a connection attempt would time out or
      // fail with a different message.
      env: { ...process.env, NODE_ENV: "development", ALLOW_SEED: "", DATABASE_URL: "postgresql://nobody@db.invalid:5432/none" },
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toMatch(/Refusing to seed/);
    expect(result.stdout).not.toContain("Seeding");
  });
});
