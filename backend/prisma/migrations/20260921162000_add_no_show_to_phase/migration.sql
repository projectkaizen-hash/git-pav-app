-- Add no_show to VanStopPhase enum
-- This allows operators to record when a patient doesn't show up for their appointment

ALTER TYPE "VanStopPhase" ADD VALUE 'no_show';
