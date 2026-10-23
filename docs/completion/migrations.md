# Migration conventions

These rules come from the Phase 1 findings (P0-1, MG-2) and the `migration-safety` checklist.

1. **Generate, then review.** Run `npx prisma migrate dev --create-only --name <change>` and read the SQL before committing it. Never use `prisma db push` against a shared database: changes it makes leave no migration behind, and that is how P0-1 happened.
2. **No idempotent DDL.** Don't write `CREATE ... IF NOT EXISTS` or conditional `DO` blocks (extensions are the exception). If an object already exists, the migration should fail loudly rather than skip silently over a different shape.
3. **One concept per migration.** Additive steps (new tables, nullable columns, constant-default columns) can ship with code that uses them. Drops and renames go through the deprecate → stop reading → drop sequence, each in a separate deploy.
4. **Indexes on existing hot tables** use `CREATE INDEX CONCURRENTLY` in a migration of their own (Prisma needs that migration to contain only that statement).
5. **No data backfills inside migrations.** Put them in a script under `backend/scripts/`, batched and restartable.
6. **SQL-only objects must be declared in `schema.prisma`** so the drift check stays clean. For example, PostGIS columns go in as `Unsupported("geometry(...)")` with `@@index(..., type: Gist)`.
7. **CI enforces it.** `prisma migrate diff --from-migrations ... --to-schema-datamodel ... --exit-code` must report no difference.

## Applying `20261023180000_reconcile_schema_drift` to an existing database

On a database built with `migrate deploy` only, this migration applies normally. On a database that already has these tables from a `db push`:

```bash
# 1. Confirm the live DB already matches the schema
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
# 2. Mark the migration as applied without running it
npx prisma migrate resolve --applied 20261023180000_reconcile_schema_drift
```
