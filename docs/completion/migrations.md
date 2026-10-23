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

## After deploying `20261023230000_opening_hours_and_rota`

The migration only creates the opening-hours and rota tables. Until a clinic has hours and a clinician has a rota, they offer no slots, so run this once after the deploy:

```bash
npm run hours:defaults   # from backend/; safe to run again
```

It gives each clinic without hours the default hours (decisions log #12) and each clinician without a rota the same weekly rota. Replace those with the real rota as soon as it's known.

## After deploying `20261024010000_user_foreign_keys`

The migration adds foreign keys from five newer tables to `users` as `NOT VALID`, so it never scans or fails on existing rows. Then, from `backend/`:

```bash
npm run db:check-orphans               # counts rows whose user no longer exists
npm run db:check-orphans -- --validate # only when every count is 0
```

The script never deletes anything. If it finds orphaned rows, leave them for review and don't validate until they're resolved.

## After deploying CS-13 (encryption keys)

There's no schema change. Encrypted van access details (gate codes and door notes) written before CS-13 still decrypt, but they rely on the old key derivation, which used `AWS_REGION`. To move them onto the current key, take a database backup and then run this from `backend/`:

```bash
npm run rewrap:encrypted            # counts the records that need it; changes nothing
npm run rewrap:encrypted -- --apply # re-wraps them; safe to run again
```

It only re-wraps each record's data key; the encrypted gate code or note itself is unchanged. It prints counts, never values. Run it again after changing `KMS_KEY_ID`. Signed download links issued before the deploy stop working (they last 15 minutes at most).

## Before deploying the CS-15 indexes (`20261024030000` to `20261024030200`)

These three migrations add partial unique indexes: one open shift per operator, one open shift per van, and one open van request per patient. They are built `CONCURRENTLY`, so they don't block writes, but they fail if duplicates already exist. Check first; each query should return no rows:

```sql
SELECT operator_id FROM van_shifts WHERE ended_at IS NULL GROUP BY 1 HAVING count(*) > 1;
SELECT van_id FROM van_shifts WHERE ended_at IS NULL GROUP BY 1 HAVING count(*) > 1;
SELECT patient_id FROM van_service_requests WHERE status IN ('pending', 'accepted', 'in_progress') GROUP BY 1 HAVING count(*) > 1;
```

If any rows come back, resolve them by hand (end the stale shift, or expire the older request after releasing its deposit) before deploying. If a migration fails part-way, Postgres leaves an invalid index behind: drop it with `DROP INDEX CONCURRENTLY "<name>";`, fix the duplicates, then mark the migration rolled back (`npx prisma migrate resolve --rolled-back <migration>`) and deploy again.

Prisma can't declare partial indexes, so they aren't in `schema.prisma`; the drift check ignores them.

## Before deploying `20261024040000_appointments_no_clinician_overlap` (CS-16)

The migration adds an exclusion constraint: a clinician can't have two live appointments (held, confirmed or in progress) whose times overlap. An exclusion constraint can't be added `NOT VALID` or concurrently, so it takes a brief exclusive lock on `appointments` and fails if overlaps already exist. Check first; this should return no rows:

```sql
SELECT a.id, b.id
FROM appointments a
JOIN appointments b ON a.clinician_id = b.clinician_id AND a.id < b.id
WHERE a.status IN ('draft_hold', 'confirmed', 'in_progress')
  AND b.status IN ('draft_hold', 'confirmed', 'in_progress')
  AND tsrange(a.start_time_utc, a.end_time_utc, '[)') && tsrange(b.start_time_utc, b.end_time_utc, '[)');
```

Expired holds count too, so let the hold sweeper run (or cancel holds whose `hold_expires_at` has passed) before deploying. Any real clash between confirmed appointments needs a person to rebook one of them. It also enables the `btree_gist` extension.
