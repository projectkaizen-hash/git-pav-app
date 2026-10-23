-- CS-08 (OT-2): a one-time code records what it was issued for and how many
-- wrong guesses it has taken, so a login code can't verify a phone sign-in
-- and a code is burned after too many tries. Additive: a nullable column and
-- a constant-default column, so no table rewrite. Codes issued before this
-- (purpose NULL) verify nothing and expire within five minutes.
ALTER TABLE "mfa_codes" ADD COLUMN "purpose" TEXT,
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
