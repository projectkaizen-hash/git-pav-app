-- CS-23 (finding DB-1): the newer tables named their user without a foreign
-- key, so rows could outlive or point at no account. Adds the missing keys
-- with ON DELETE RESTRICT: accounts are erased by pseudonymising, never by
-- deleting the user row (lib/erasure.ts).
-- NOT VALID: Postgres checks every new and updated row straight away but
-- doesn't scan existing rows under a lock, and the migration can't fail on
-- an old orphan. After deploying, run `npm run db:check-orphans`; when it
-- reports none, `npm run db:check-orphans -- --validate` validates the keys.
-- Rollback: drop the five constraints.

-- AddForeignKey
ALTER TABLE "message_threads" ADD CONSTRAINT "message_threads_patient_user_id_fkey" FOREIGN KEY ("patient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

-- AddForeignKey
ALTER TABLE "financing_applications" ADD CONSTRAINT "financing_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

-- AddForeignKey
ALTER TABLE "reward_points_awards" ADD CONSTRAINT "reward_points_awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

-- AddForeignKey
ALTER TABLE "oral_health_metrics" ADD CONSTRAINT "oral_health_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
