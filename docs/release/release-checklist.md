# Pav Dental: Production Release Readiness Checklist (Phase 5)

This checklist serves as the formal Go / No-Go decision framework for releasing the Pav Dental platform (Mobile App, Backend API Gateway, Public Marketing & Shop Website, and Staff Admin Back Office).

---

## 1. Technical Gates (Automated & CI)

| Gate | Requirement | Status | Verification Method |
|---|---|---|---|
| **CI Pipeline** | All 5 CI workflows green on `main` (Backend tests/builds/docker, Mobile tests/lint, Website, Admin dashboard) | Passed | GitHub Actions `.github/workflows/ci.yml` |
| **Backend Unit & Integration** | 57 Jest suites, 461 tests passing with 0 failures | Passed | `cd backend && npx jest --runInBand` |
| **Backend E2E System Test** | 34 end-to-end integration flows passing | Passed | `cd backend && npm run test` |
| **Prisma Migrations** | Zero schema drift against migrations (`migrate diff` exit 0) | Passed | `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-migrations prisma/migrations --exit-code` |
| **Mobile Automated Tests** | 18 automated test suites passing with 0 failures | Passed | `cd pavdental && npm run test:all` |
| **Mobile Lint Hygiene** | 0 ESLint errors across all screens and components | Passed | `cd pavdental && npm run lint` |
| **Mobile Content Guard** | Zero fabricated clinical content or hardcoded clinician data | Passed | `cd pavdental && npm run check:content` |
| **Website & Dashboard Builds** | Production builds succeed with zero type errors | Passed | `cd website && npm run build`, `cd admin-dashboard && npm run build` |
| **Disaster Recovery** | Backup and point-in-time recovery runbook documented | Passed | `docs/deploy/backup-and-restore-runbook.md` |

---

## 2. Clinical Governance Gates (🛑 Clinical Sign-off)

Clinical review by Principal Dental Surgeon (Dr. Tariq Pav, GDC #248912 or designated Clinical Director):

- [ ] **Emergency Triage Thresholds:** Review red-flag triage criteria (severe facial swelling, difficulty swallowing/breathing, trauma) directing emergency cases to 999/A&E.
- [ ] **Prescribing Formulary & Authorization:** Sign off on authorized prescriber roles (Dentists only; dental hygienists and dental therapists excluded unless possessing supplementary prescriber qualifications).
- [ ] **Clinical Notes & Odontogram Vocabulary:** Review tooth condition classifications (healthy, decay, filling, crown, missing) and append-only charting audit rules.
- [ ] **Radiation & Radiographs:** Confirm radiographic retention and referral protocols adhere to IR(ME)R 2017 regulations.
- [ ] **Patient Discharge Summaries:** Approve standard post-visit discharge advice wording and emergency contact information.

---

## 3. Legal, Privacy & Compliance Gates (🛑 Legal Review)

Legal review by designated Data Protection Officer (DPO) and Healthcare Compliance Counsel:

- [ ] **DPIA Review:** Sign off on Data Protection Impact Assessment draft (`docs/compliance/dpia-draft.md`).
- [ ] **Patient Privacy Notice:** Sign off on public & in-app Privacy Notice (`docs/compliance/privacy-notice-draft.md`).
- [ ] **DPA Tracker:** Verify executed Data Processing Agreements with third-party processors (`docs/compliance/dpa-tracker.md`).
- [ ] **NHS DSPT Standard:** Confirm compliance with NHS Data Security and Protection Toolkit (DSPT) requirements for dental practices.
- [ ] **ICO Registration:** Confirm active registration with the Information Commissioner's Office as a Health Data Controller.
- [ ] **Retention Schedule:** Formal approval of 11-year adult / age 25 paediatric retention rule under GDC and NHS guidelines.
- [ ] **CQC Registration:** Care Quality Commission mobile dental unit registration numbers verified for London and Birmingham operating vans.

---

## 4. Mobile App Store Submission Gates

### iOS App Store (Apple Developer)
- [ ] Apple Developer Team ID: `PAV8899210` confirmed in `eas.json` and Apple Developer Portal.
- [ ] Bundle Identifier: `com.pavdental.app` registered with Apple Pay (`merchant.com.pavdental.app`) and Associated Domains (`applinks:pavdental.com`).
- [ ] Age Rating: 17+ (Medical / Treatment Information).
- [ ] App Privacy Nutrition Labels completed matching `docs/release/store-listing.md`.
- [ ] Test Account credentials provisioned for Apple App Reviewers without real patient data.
- [ ] EAS production build generated: `eas build --profile production --platform ios`.

### Google Play Store (Google Play Console)
- [ ] Package Name: `com.pavdental.app`.
- [ ] Production keystore safely secured in EAS Secrets.
- [ ] Target API Level: Android 15 (API level 35) / minimum SDK 24.
- [ ] Data Safety Section submitted in Google Play Console.
- [ ] Permission Declarations: Camera (`CAMERA`), Fine Location (`ACCESS_FINE_LOCATION` for van dispatch).
- [ ] EAS production build generated: `eas build --profile production --platform android`.

---

## 5. Production Infrastructure & Environment

- [ ] Production Database: Managed PostgreSQL with PostGIS extension enabled in AWS London (`eu-west-2`).
- [ ] Production Redis: Multi-AZ Redis cluster with persistence for distributed locks and rate limiting.
- [ ] Environment Variables: Verify all live secrets in production environment:
  - `DATABASE_URL` (AWS RDS Postgres London)
  - `REDIS_URL` (AWS ElastiCache Redis)
  - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (256-bit cryptographically random strings)
  - `AUDIT_HMAC_SECRET` (Unique secret for audit chain hashing)
  - `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` (`live_` keys)
  - `KMS_KEY_ID` (AWS KMS customer managed key for PHI envelope encryption)
  - `S3_BUCKET_NAME` / `AWS_REGION` (Document vault S3 bucket with default KMS encryption)
  - `DAILY_API_KEY` (Production Daily.co account for WebRTC consults)
  - `POSTMARK_API_TOKEN` / `TWILIO_AUTH_TOKEN` (Live notification dispatches)
  - `SENTRY_DSN` (Production error monitoring with PII scrubber active)
- [ ] Ensure `ALLOW_DEV_DEFAULTS` is **NOT** set in production.
- [ ] Run release migration: `npx prisma migrate deploy`.

---

## 6. Rollback & Contingency Plan

1. **API Rollback:** Container deployment supports zero-downtime rollback to prior image SHA in under 60 seconds.
2. **Database Rollback:** All migrations are strictly additive; rolling back backend container does not require schema rollbacks.
3. **Mobile Rollback:** EAS Update rollback or emergency point release submission to Apple/Google.
4. **Clinical Escalation Hotline:** Phone lines manned by clinical reception during launch window for patients needing assistance.
