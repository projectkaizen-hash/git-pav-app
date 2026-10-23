-- CS-15 (VR-6, DB-2): a van can have only one open shift. See
-- 20261024030000 for why this is partial, concurrent and not in schema.prisma.
-- Rollback: DROP INDEX CONCURRENTLY "van_shifts_one_open_per_van".
CREATE UNIQUE INDEX CONCURRENTLY "van_shifts_one_open_per_van" ON "van_shifts"("van_id") WHERE "ended_at" IS NULL;
