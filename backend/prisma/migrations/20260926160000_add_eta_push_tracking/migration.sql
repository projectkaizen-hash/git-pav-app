-- Live ETA re-push tracking on van service requests.
-- last_eta_seconds gates "material change" pushes; last_eta_pushed_at
-- enforces the per-patient throttle window.

ALTER TABLE "van_service_requests" ADD COLUMN "last_eta_seconds" INTEGER;
ALTER TABLE "van_service_requests" ADD COLUMN "last_eta_pushed_at" TIMESTAMP(3);
