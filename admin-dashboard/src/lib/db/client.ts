import fs from "node:fs";
import path from "node:path";

// Types for generic query
export type QueryFn = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

const globalForDb = globalThis as unknown as {
  queryFn?: QueryFn;
  initPromise?: Promise<QueryFn>;
};

/** Run all numbered SQL migration files in order. Safe to re-run (uses IF NOT EXISTS). */
async function runMigrations(exec: (sql: string) => Promise<unknown>) {
  const migrationsDir = path.join(process.cwd(), "src/lib/db/migrations");
  if (!fs.existsSync(migrationsDir)) return;

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // lexicographic – 001, 002, 003 …

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    try {
      await exec(sql);
    } catch (err: unknown) {
      // Log but don't crash – some migrations may be partial on retry
      console.error(`[db] Migration ${file} error:`, (err as Error).message);
    }
  }

  // Also run seed if present
  const seedPath = path.join(process.cwd(), "src/lib/db/seed.sql");
  if (fs.existsSync(seedPath)) {
    try {
      console.log("[db] Running seed data...");
      await exec(fs.readFileSync(seedPath, "utf8"));
      console.log("[db] Seed data executed successfully");
    } catch (err: unknown) {
      console.error("[db] Seed error:", (err as Error).message);
      console.error("[db] Seed stack:", (err as Error).stack);
    }
  } else {
    console.log("[db] No seed.sql file found");
  }

  console.log("[db] All migrations applied.");
}

async function createQueryClient(): Promise<QueryFn> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  // 1. If real DATABASE_URL is set, use node-postgres (pg.Pool)
  if (databaseUrl) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl, max: 10 });

    const queryFn = async <T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> => {
      const res = await pool.query(text, params);
      return res.rows as T[];
    };

    // Run migrations against real DB on startup
    await runMigrations((sql) => pool.query(sql));

    return queryFn;
  }

  // 2. Otherwise in local dev/preview, use embedded PGlite
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = path.join(process.cwd(), ".pgdata_admin");
  const pg = new PGlite(dataDir);
  await pg.waitReady;

  // Run ALL migrations (idempotent – all use CREATE TABLE IF NOT EXISTS)
  await runMigrations((sql) => pg.exec(sql as string));

  return async <T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> => {
    const res = await pg.query<T>(text, params);
    return res.rows;
  };
}

export async function query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> {
  if (!globalForDb.queryFn) {
    globalForDb.initPromise ??= createQueryClient().then((fn) => {
      globalForDb.queryFn = fn;
      return fn;
    });
    await globalForDb.initPromise;
  }
  return globalForDb.queryFn!<T>(text, params);
}
