-- CS-15 (VR-6, DB-2): an operator can have only one open shift. Before this,
-- two quick "start shift" taps could both pass the app-level check.
-- Partial unique index: only shifts that haven't ended count. CONCURRENTLY,
-- so it doesn't block writes; Prisma needs it alone in its migration.
-- If it fails on existing duplicates, see docs/completion/migrations.md.
-- Prisma can't declare partial indexes, so it isn't in schema.prisma; the
-- drift check ignores it. Rollback: DROP INDEX CONCURRENTLY "van_shifts_one_open_per_operator".
CREATE UNIQUE INDEX CONCURRENTLY "van_shifts_one_open_per_operator" ON "van_shifts"("operator_id") WHERE "ended_at" IS NULL;
