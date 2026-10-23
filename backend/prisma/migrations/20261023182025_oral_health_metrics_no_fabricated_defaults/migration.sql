-- Metadata only: no rows are rewritten. Existing fabricated values are
-- cleared by scripts/purge-fabricated-data.ts, not here. Rollback: set the
-- old defaults and NOT NULL again (after backfilling any nulls).
-- AlterTable
ALTER TABLE "oral_health_metrics" ALTER COLUMN "points_balance" SET DEFAULT 0,
ALTER COLUMN "streak_days" SET DEFAULT 0,
ALTER COLUMN "plaque_index_percent" DROP NOT NULL,
ALTER COLUMN "plaque_index_percent" DROP DEFAULT,
ALTER COLUMN "bleeding_percent" DROP NOT NULL,
ALTER COLUMN "bleeding_percent" DROP DEFAULT,
ALTER COLUMN "recall_days_remaining" DROP NOT NULL,
ALTER COLUMN "recall_days_remaining" DROP DEFAULT;

