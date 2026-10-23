-- Add paymentIntentId to VanServiceRequest for Stripe payment integration
-- This allows tracking the payment intent for van service deposits

ALTER TABLE "van_service_requests" ADD COLUMN "payment_intent_id" TEXT;
