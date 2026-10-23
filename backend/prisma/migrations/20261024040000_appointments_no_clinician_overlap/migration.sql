-- CS-16 (BK-2, DB-2): a clinician can't have two live appointments that
-- overlap. Before this, two bookings for the same clinician and time could
-- both pass the route's read-then-insert check.
-- "Live" is a hold, a confirmed visit or one in progress. An expired hold
-- still counts until it is cancelled; the booking route cancels expired
-- holds in its way before inserting, as the hold sweeper would.
-- Times are half-open, so back-to-back appointments are fine. Van visits
-- without a clinician aren't covered: their times are ETA estimates.
-- An exclusion constraint can't be NOT VALID or built concurrently: it
-- takes a brief exclusive lock on appointments and fails if overlaps
-- already exist (see docs/completion/migrations.md for the check).
-- Prisma can't declare it, so it isn't in schema.prisma.
-- Rollback: ALTER TABLE "appointments" DROP CONSTRAINT "appointments_no_clinician_overlap";
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_clinician_overlap"
  EXCLUDE USING gist ("clinician_id" WITH =, tsrange("start_time_utc", "end_time_utc", '[)') WITH &&)
  WHERE ("clinician_id" IS NOT NULL AND "status" IN ('draft_hold', 'confirmed', 'in_progress'));
