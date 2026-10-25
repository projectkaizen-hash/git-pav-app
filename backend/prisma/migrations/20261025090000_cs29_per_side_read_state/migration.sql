-- CS-29: separate unread flags for the patient and the staff side of a thread.
-- Constant defaults, so on Postgres 11+ this is a metadata-only change with no
-- table rewrite. Existing rows are backfilled by scripts/backfill-thread-read-state.ts.
ALTER TABLE "message_threads" ADD COLUMN "patient_unread" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "message_threads" ADD COLUMN "staff_unread" BOOLEAN NOT NULL DEFAULT false;
