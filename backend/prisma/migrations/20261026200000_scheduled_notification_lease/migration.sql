-- BE-22: lease for claimed reminders. Additive and nullable, safe with the
-- previous release still running (docs/completion/migrations.md rule 3).
ALTER TABLE "scheduled_notifications" ADD COLUMN "claimed_at" TIMESTAMP(3);
