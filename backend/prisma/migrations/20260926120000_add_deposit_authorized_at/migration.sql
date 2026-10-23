-- Add deposit authorization timestamp to van service requests.
-- Set when the patient successfully authorizes the manual-capture PaymentIntent
-- (via payment_intent.amount_capturable_updated webhook).
ALTER TABLE "van_service_requests" ADD COLUMN "deposit_authorized_at" TIMESTAMP(3);
