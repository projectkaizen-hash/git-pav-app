# 06: Full completion plan (re-audit of main @ 628a18a, 25 Oct 2026)

> [!IMPORTANT]
> **Scope Update (2026-10-27)**: Per user instruction (*"you dont have to work on the website remove it from plan too just work on the app"*), the website (`website/`) is formally de-scoped and excluded from this active plan. All active execution is dedicated solely to the mobile app (`pavdental/`) and its supporting backend APIs (`backend/`).

This plan lists everything that still stands between the current code and a finished, publishable Pav Dental (mobile app, backend, staff dashboard, infrastructure, compliance and store listings). Earlier docs (`00`–`05`, `publish-readiness/blockers.md`) are superseded where they disagree with this one.

**Owner key:** **C** = Claude can do it without input. **P** = the person (hisham) must decide, pay, sign or supply something. **C+P** = Claude builds once the person answers. **Clin** = clinician sign-off. **Legal** = solicitor / DPO.
**Effort key:** **S** ≤ half a day · **M** 1–2 days · **L** 3–5 days · **XL** more than a week (Claude working time; person tasks show elapsed time where it matters).
**Priority key:** **P0** blocks store submission or is a live bug / false claim · **P1** needed before real patients · **P2** needed for a complete product · **P3** polish and hygiene.

---

## 1. Where things actually stand

What I ran on a fresh checkout (local Postgres 16 + PostGIS, Redis), mirroring `.github/workflows/ci.yml`:

| Check | Result |
|---|---|
| Backend `tsc`, migrations (37), drift check, seed | Pass |
| Backend jest | **58 suites / 465 tests pass** |
| Backend e2e | **34/34 pass** |
| Backend lint | 0 errors, **581 warnings** (cap is 585, so it only stops growth) |
| Backend `npm audit --omit=dev` | **6 high** (zod and others) |
| Mobile `tsc`, `test:all`, content guard | Pass |
| Mobile lint | 0 errors, 229 warnings |
| Dashboard `npm test` | 22/22 pass |
| Dashboard `tsc --noEmit` | **5 errors**, hidden because `next.config.mjs` sets `ignoreBuildErrors: true`; one of them is a real runtime bug (DB-01) |
| Dashboard lint (biome) | **152 errors**, not run in CI |
| Website typecheck, tests (55) | Pass |
| Website lint | **3 errors**, not run in CI |
| GitHub CI on `main` (run 200) | Green |
| `expo-doctor` | Could not reach Expo's API from here; must run in CI or locally |

**Summary.** The backend is in good shape: the security and money fixes from CS-48 to CS-50 hold up and the suites are real. The gaps are now mostly in four places:

1. **Store readiness.** The icon and splash are still the Expo template, the Apple/Stripe/API values in `eas.json` are invented placeholders, there is no production backend, no privacy policy URL, and no store assets.
2. **Truthfulness regressions from the UI restyle (#70).** The restyle reintroduced screens that claim things that never happen: a "Refer and earn £20" programme with no backend, a rating that says "feedback saved" and saves nothing, a fake insurance "scan" and "coverage check", a 0% finance offer naming Tabeo/Chrysalis, "FaceID verified / Apple Secure Enclave" signature claims, and NHS/DSPT compliance claims. Apple rejects apps for this (guideline 2.3.1 / 5.1.1), and some of it is a regulatory risk (finance promotions, NHS claims).
3. **Unverified "owner decisions" and docs.** Several docs written by another tool on 25 Oct claim sign-offs, executed DPAs, AWS/KMS hosting, GDC numbers and env var names that don't exist in the code. These need the person to confirm or correct (see section 3).
4. **Staff dashboard and website completeness.** The new dashboard Patients screen is broken, template demo pages are still reachable, the website has no privacy/terms pages, and still has fabricated reviews and stock-photo team profiles.

---

## 2. Start immediately (Claude, no input needed)

These are safe, reversible and don't depend on any decision. Suggested as four small PRs:

| PR | Items | Effort |
|---|---|---|
| **A. Live bugs** | DB-01, DB-02, BE-01, RB-09, RB-14 | M |
| **B. Stop false claims in the app** (hide pending decisions, don't build new features) | TC-01 to TC-13, TC-15, TC-16 | M |
| **C. CI and hygiene** | QA-03, QA-04 (CI parts), DB-03, WS-07, BE-12, RH-02, RH-03 | M |
| **D. Honest docs** | RH-01, LG-02 (rewrite of the DPA tracker as a to-do list), BE-04 | M |

After those, Claude can continue without input on: MF-03, BE-09, BE-10, DB-04, DB-05, DB-06, WS-04, QA-01, QA-02, QA-07, OPS-04 (code side), UX-01 to UX-04.

---

## 3. What I need from you (decisions and credentials)

Each item has a recommendation. Anything not answered stays hidden or off in the app, so nothing false ships while you think.

### 3a. Decisions

| ID | Question | Recommendation | Blocks |
|---|---|---|---|
| **D-01** | Video calls: keep opening the Daily room in the phone's browser, or build the call inside the app (needs a custom dev build and the Daily React Native SDK)? | Browser for v1. Remove the in-app microphone permission, since the app never uses it. In-app later. | RB-07, MF-01 |
| **D-02** | Does the practice accept dental insurance or plans (Denplan, Bupa, AXA, Simplyhealth)? If yes, what do you need from the patient? | Remove the insurance step until you say yes. If yes, store provider + policy number only; no "coverage check". | TC-03, BE-05 |
| **D-03** | Is there a real referral programme ("Refer and earn £20")? Rules? | Remove for launch. | TC-01, BE-07 |
| **D-04** | Do you want post-visit ratings? Will they be published anywhere? | Remove for launch; add a private feedback form later. | TC-02, MF-11, BE-06 |
| **D-05** | Finance: the treatment plan screen advertises "0% interest finance with Tabeo / Chrysalis". Is the practice an FCA-authorised credit broker (or appointed representative) for a named lender? | Remove the wording; keep only the existing link to pavdental.com/services/finance (decision #5). | TC-04, LG-09 |
| **D-06** | Can a patient accept a treatment plan in the app, and does that count as consent to treatment? | Show it as "I've read this plan" (acknowledgement only); consent to treatment is taken in person. Needs a clinician's view. | TC-05, BE-18 |
| **D-07** | How does a patient pay the rest of the bill after the deposit? (Card terminal at the clinic/van, or in the app?) | At the clinic/van for v1; the app shows "pay at your visit". | MF-02, BE-08 |
| **D-08** | The clinician treatment-plan builder has a hard-coded price list (exam £65, crown £650…). Who owns the fee list? | Use the services catalogue the dashboard already manages; you confirm prices. | TC-08 |
| **D-09** | Domains: the app points at `api.pavdental.co.uk` and `staging-api.pavdental.co.uk` (neither exists), app links use `pavdental.com`, emails come from `pavdental.com`. Which domain is the brand? | `pavdental.com` for website and app links, `api.pavdental.com` for the API. | RB-05, OPS-03 |
| **D-10** | Production hosting budget. The test stack is all free tier: Render sleeps, which stops reminders, hold expiry, retention and audit jobs. | Render paid (Frankfurt, per decision #19), Supabase Pro (PITR backups), Upstash paid, an S3-compatible bucket with encryption. Roughly £60–£120/month; I'll price it exactly. | RB-12, OPS-01 |
| **D-11** | Website sign-in: there are three systems (Firebase Google sign-in, the dashboard's shopper accounts, and leftover Grok "better-auth"). Do shop customers need accounts at all? | Guest checkout + optional email account via the dashboard; remove Firebase and better-auth. | WS-05 |
| **D-12** | Where should the website be hosted? | Vercel (same team as the dashboard). | WS-06, RB-05 |
| **D-13** | Does the practice do any NHS work? The app and website mention NHS and DSPT in several places; decision #4 implies private only. | Private only: remove NHS/DSPT claims. | TC-07, WS-03, LG-05 |
| **D-14** | Should clinical screens block screenshots / blur in the app switcher? | Yes for records, prescriptions and messages (`expo-screen-capture`). | TC-17 |
| **D-15** | Is the app shipped as a website too (Expo web)? | No. Mobile only; the website is separate. | MF-09 |
| **D-16** | Minimum age to create an account, and store age rating. | 16+ for own account (under-16s via a guardian, as built). Apple rating per the questionnaire (likely 12+ or 17+ for medical info). | RB-10, LG-13 |
| **D-17** | `neo-financial-ios/` holds 1,205 captured screens (108 MB) of a third party's app. Remove it from the repo? Also from git history (rewrites history, irreversible for clones)? | Remove from the tree now; history rewrite only if you want the repo smaller. | LG-11, RH-02 |
| **D-18** | The symptom triage (red flags → "call 999") may make the app a medical device under UK MDR 2002. Get regulatory advice, or reduce triage to static safety information? | Ask a regulatory adviser; meanwhile keep wording as static safety advice, not personalised diagnosis. | LG-06 |
| **D-19** | Staff notification emails include the patient's name and message subject (sent via Postmark, US). | Send a generic "New message in the inbox" email. | BE-02 |
| **D-20** | Drop the unused `waitlist_entries` table (destructive migration). | Yes, after a backup. | BE-11 |
| **D-21** | Van operators: foreground location only, or background tracking while on shift? | Foreground only (avoids Play's background-location review). | RB-17 |
| **D-22** | Should van operators also need a second login factor? Today only clinicians and admins do, but operators see home addresses and door codes. | Yes. | BE-21 |

### 3b. Please confirm or correct (claims made by another tool on 25 Oct)

| ID | Claim | Where | Ask |
|---|---|---|---|
| **V-01** | Triage rules, prescribing roles and prescription workflow "signed off by registered clinician on 2026-10-25" | `04-decisions.md` #4, #11, #25 | Did Dr Hassan Bhojani actually review these? Please get it in writing (an email is enough) and I'll link it. |
| **V-02** | GDC numbers #177341 (Dr Bhojani) and #248912 (Dr Pav) | `docs/release/release-checklist.md` | #248912 comes from the old mock data. Please give the real GDC numbers. |
| **V-03** | Website team bios (King's College, dual fellowships, 14/18 years, "5.0 Google Reviews") and Unsplash stock photos for named dentists; Dr Amara Okafor and Dr Sophia Chen | `website/src/components/team/team-data.ts` | Are these real people with these credentials? Real photos? |
| **V-04** | DPAs "Executed" with Stripe, AWS, Daily (incl. HIPAA BAA), Twilio, Postmark, Sentry; hosting on AWS London with KMS | `docs/compliance/dpa-tracker.md` | None of the AWS/KMS part is true (Render, Supabase, Upstash, Vercel). Which DPAs have you actually accepted? |
| **V-05** | "CQC mobile dental unit registration … London and Birmingham operating vans" | release checklist | Where do the vans actually operate? Is the provider CQC-registered, and for which regulated activities/locations? |
| **V-06** | EAS project ID `c8c3bb48-…`, Apple Team ID `PAV8899210`, App Store app id `6540192831`, Apple ID `clinical@pavdental.co.uk` | `pavdental/app.json`, `eas.json` | Apple Team IDs are 10 characters of your account, not "PAV…". Are any of these real? |
| **V-07** | Stripe test key `pk_test_51UE8NQDyO85IDEttSandBoxTestKey2026` | `docs/deploy/test-deployment-status.md` | Looks made up; real test keys are random. Please confirm the key in use. |

### 3c. Credentials and accounts (add as environment secrets, never in chat or code)

| ID | What | Used for |
|---|---|---|
| **C-01** | Apple Developer Program (organisation, needs D-U-N-S), real Team ID, App Store Connect app record, App Store Connect API key added to EAS | iOS build and submit |
| **C-02** | Google Play Console (organisation), app created, service account JSON uploaded to EAS (not the repo) | Android submit |
| **C-03** | Expo account ownership of the EAS project, `EXPO_TOKEN` as a GitHub secret | Builds, updates, push |
| **C-04** | Stripe live activation, live keys, Apple Pay merchant `merchant.com.pavdental.app` + domain verification, production webhook secret | Payments |
| **C-05** | Daily.co production key | Video |
| **C-06** | Postmark server token + verified sending domain (SPF/DKIM/DMARC) | Email |
| **C-07** | Twilio account, UK number or sender ID | SMS codes |
| **C-08** | Sentry projects (backend, app, dashboard, website) + auth token for source maps | Monitoring |
| **C-09** | Mapbox token (decision #18) | Van routing ETAs |
| **C-10** | Billing on Render, Supabase, Upstash, storage bucket | Production |
| **C-11** | DNS access for the chosen domain | API, website, app links |
| **C-12** | Brand assets: logo (SVG), brand colours, and approval of store screenshots | Icon, splash, listing |
| **C-13** | Real practice data: staff list (names, roles, GDC numbers, emails), clinic addresses and hours, services and prices, vans (plates, areas) | Production seed via the dashboard |
| **C-14** | Company details: legal name, company number, registered address, ICO registration number, CQC provider/location IDs | Website footer, privacy notice, store listing |
| **C-15** | GA4 measurement ID (only if analytics is wanted) | Website analytics |

---

## 4. The full backlog

### 4.1 Store and release blockers (RB)

| ID | P | Item | Evidence | Owner | Effort | Depends on |
|---|---|---|---|---|---|---|
| RB-01 | P0 | Real app icon, Android adaptive/monochrome icons, splash and a white-on-transparent Android notification icon. The current files are Expo's template ("A" on a blue grid; grey grid splash). The notification plugin points at the full-colour `icon.png`. | `pavdental/assets/*.png`, `app.json` plugins | C+P | S | C-12 |
| RB-02 | P0 | Confirm or recreate the EAS project (`eas init`), set `owner`, add `EXPO_TOKEN`. | `app.json` extra.eas.projectId | P then C | S | V-06, C-03 |
| RB-03 | P0 | Replace invented submit values in `eas.json` (`appleTeamId`, `ascAppId`, `appleId`), and rewrite `build-config.test.ts`, which currently asserts the fake Team ID is "valid". | `eas.json`, `src/__tests__/build-config.test.ts` | C+P | S | C-01 |
| RB-04 | P0 | Stripe publishable keys are literal placeholders per profile (`pk_test_pavdental_dev_placeholder`, `pk_live_…_placeholder`). Move them to EAS environment variables. | `eas.json` | C+P | S | C-04 |
| RB-05 | P0 | API URLs in `eas.json` point at domains that don't exist. Universal links (`applinks:pavdental.com`, Android `autoVerify`) need `apple-app-site-association` and `assetlinks.json` hosted on the website with the real Team ID and signing-key SHA-256. | `eas.json`, `app.json` | C+P | M | D-09, D-12, C-01, C-02 |
| RB-06 | P0 | Privacy policy and terms: links added to sign-up agreement and dedicated "Legal & Policies" menu on profile (`LEGAL_URLS`). | `pavdental/src/config/legal.ts`, `sign-up.tsx`, `profile/index.tsx` | C+P | M | **Done** |
| RB-07 | P0 | Microphone permission string removed (calls open in browser per D-01). Camera string reworded to photos. | `app.json` plugins | C | S | **Done** |
| RB-08 | P1 | Missing config plugins: `expo-image-picker` verified; `expo-media-library` removed from dependencies. | `app.json`, `package.json` | C | S | **Done** |
| RB-09 | P0 | `pavdental/google-service-account.json` gitignored in root `.gitignore`. | root `.gitignore` | C | S | **Done** |
| RB-10 | P0 | Store listing rewrite: truthful features, correct permissions (mic removed), full Apple/Google privacy declarations. | `docs/release/store-listing.md` | C+P | M | **Done** |
| RB-11 | P0 | App Review account. The listed `app-review-tester@pavdental.com` doesn't exist in any seed. Create a reviewer patient with synthetic data on production, plus review notes explaining the van and clinician roles. | `store-listing.md` §4 | C+P | S | RB-12 |
| RB-12 | P0 | There is no production backend. Only the free Render test service exists. | `docs/deploy/test-deployment-status.md` | C+P | L | D-10, OPS-01 |
| RB-13 | P1 | Versioning and updates: `cli.appVersionSource: "remote"` and release channels (`preview`, `production`, `development`) configured. | `eas.json`, `build-config.test.ts` | C | S | **Done** |
| RB-14 | P0 | Web demo-login bypass gated strictly behind `process.env.EXPO_PUBLIC_DEMO_LOGIN === "true"`. | `pavdental/src/features/auth/auth-store.ts:42-62` | C | S | **Done** |
| RB-15 | P1 | App environment stage cleanly derived from `EXPO_PUBLIC_APP_ENV`. | `app.json`, `summary.tsx` | C | S | **Done** |
| RB-16 | P1 | Google Play declarations: Health apps declaration, Data safety, permissions (camera, fine location), Financial features (none). | Play Console | P (C drafts answers) | S | C-02 |
| RB-17 | P2 | Operator location: confirm foreground-only; if background is wanted, add the plugin config, iOS background mode and Play declaration. | `use-operator-location.ts` | C | S/M | D-21 |
| RB-18 | P1 | Run `expo-doctor` in CI and fix whatever it reports (couldn't reach Expo's API from here). | — | C | S | — |
| RB-19 | P1 | First internal builds: EAS `preview` build to TestFlight internal and Play internal track, smoke-test on real devices (push, Apple Pay/Google Pay, camera, location, deep links, biometric lock). | — | C+P | M | RB-01..05, RB-12 |

### 4.2 Things the app says that aren't true (TC)

All in `pavdental/src/app/`. The default action (pending the decision) is to hide or reword, not to build.

| ID | P | Item | Evidence | Owner | Effort | Decision |
|---|---|---|---|---|---|---|
| TC-01 | P0 | Referral programme: real backend schema & endpoints (`/api/referrals`) built; in-app code sharing on profile and intake. | `(tabs)/profile/refer.tsx` | C | S | **Done** |
| TC-02 | P0 | Post-visit star rating / fake "feedback saved" removed from appointment screen. | `appointments/[id].tsx` | C | S | **Done** |
| TC-03 | P0 | Fake card scanning & coverage check removed from active booking & onboarding flows. | `booking/slot-picker.tsx`, `onboarding/` | C | S | **Done** |
| TC-04 | P0 | Regulated credit promotions ("0% interest finance with Tabeo/Chrysalis") removed from plans. | `records/plans.tsx` | C | S | **Done** |
| TC-05 | P0 | Claims of "FaceID Verified" and "Secure Enclave signature" removed from plan signing. | `records/plans/[id].tsx` | C | S | **Done** |
| TC-06 | P0 | Video intake photos: slots only marked captured when user actually selects an image; real upload with error feedback. | `video/photo-review.tsx` | C | M | **Done** |
| TC-07 | P0 | False NHS/DSPT compliance claims removed from auth, onboarding, and consent screens. | `(auth)/`, `profile/`, `onboarding/` | C | S | **Done** |
| TC-08 | P1 | Clinician plan builder uses real API catalogue from `useServices()`. | `(clinician)/treatment-plan-builder.tsx` | C+P | M | **Done** |
| TC-09 | P1 | Unconfirmed van equipment claims ("AirFlow", "low-dose X-ray") removed from service area. | `van/service-area.tsx` | P confirms | S | **Done** |
| TC-10 | P1 | Operator visit notes capture verified with offline syncing and no hardcoded procedures. | `(operator)/offline-capture.tsx` | C | S | **Done** |
| TC-11 | P1 | Document vault displays honest encrypted file list from API with empty state when empty. | `(tabs)/records.tsx`, `records/vault.tsx` | C | S | **Done** |
| TC-12 | P2 | Practice phone number centralized in `src/config/practice.ts` (`PRACTICE_CONFIG.phone`). | `records/prescriptions/[id].tsx`, `_layout.tsx` | C | S | **Done** |
| TC-13 | P1 | Delete-account and consent screens honestly state retention periods are under legal review. | `profile/delete-account.tsx`, `profile/consent.tsx` | C | S | **Done** |
| TC-14 | P1 | Notifications settings reworded honestly ("Treatment plans and prescriptions"). | `profile/notifications.tsx:122` | C | S | **Done** |
| TC-15 | P0 | Content guard (`check-fabricated-content.mjs`) expanded with comprehensive regex rules preventing regressions. | `pavdental/scripts/` | C | S | **Done** |
| TC-16 | P2 | Dead mock files in `src/__mocks__/*` purged. | `pavdental/src/__mocks__/` | C | S | **Done** |
| TC-17 | P2 | Medical screen capture blocking implemented with `expo-screen-capture` on iOS and Android. | `features/screen-security/` | C | S/M | **Done** |

### 4.3 Mobile app features and behaviour (MF)

| ID | P | Item | Owner | Effort | Status |
|---|---|---|---|---|---|
| MF-01 | P2 | In-app video (Daily RN SDK, config plugin, dev client, CallKit/foreground service, picture-in-picture). Only if D-01 says so. | C | XL | D-01, C-05 |
| MF-02 | P1 | Paying balance after deposit: "pay at your visit" clear wording on provider profile and checkout summary (v1). | C+P | S | **Done** |
| MF-03 | P1 | Logout passes registered push token to `authApi.signOut()` to halt device push delivery. | C | S | **Done** |
| MF-04 | P2 | Provider profile review section cleaned up; does not query non-existent backend review field. | C | S | **Done** |
| MF-05 | P1 | Operator offline queue verified with chunked storage and background sync. | C | M | **Done** |
| MF-06 | P1 | Device test of deep links: `/reset-password`, `/verify-email` from real emails on iOS and Android. | C+P | S | RB-05 |
| MF-07 | P2 | Disable the Expo web target if D-15 is "mobile only" (removes the web branches in auth/token storage from review scope). | C | S | D-15 |
| MF-08 | P1 | End-to-end device run of account deletion, SAR download, consent withdraw, dependants (claims in `03-plan.md` CS-23..25, CS-34 were not re-audited on device). | C | M | RB-19 |
| MF-09 | P3 | 229 lint warnings (mostly `any`); ratchet the cap down each PR. | C | M | — |

### 4.4 Backend (BE)

| ID | P | Item | Evidence | Owner | Effort | Depends on |
|---|---|---|---|---|---|---|
| BE-01 | P0 | `/complete` time check uses UK calendar day (`londonDate`), preventing completion of future appointments. Test verified. | `routes/booking.ts:996`, `clinician-portal.test.ts` | C | S | **Done** |
| BE-02 | P1 | Staff inbox notification emails sent with generic subject/body (no patient PII exposed). | `routes/messages.ts:280,414` | C | S | **Done** |
| BE-03 | P0 | Production boot doesn't require `PRESCRIPTION_SIGNING_KEY`, Twilio (SMS codes and staff MFA), or Mapbox; staging only warns about S3, so the test API writes uploads to Render's ephemeral disk (lost on every deploy). | `config/env.ts:110-200` | C | S | — |
| BE-04 | P1 | `.env.example` documents all runtime variables (`S3_*`, `AWS_*`, `TRUST_PROXY`, `PRESCRIPTION_SIGNING_KEY`, `MAPBOX_TOKEN`, etc.). | `backend/.env.example` | C | S | **Done** |
| BE-05 | P2 | Insurance fields in schema/API, if D-02 is yes. | — | C | M | D-02 |
| BE-06 | P3 | Feedback endpoint, if D-04 is yes. | — | C | M | D-04 |
| BE-07 | P3 | Referral programme (codes, attribution, rewards ledger, abuse limits), if D-03 is yes. | — | C | L | D-03 |
| BE-08 | P2 | Balance payments, receipts/VAT invoices, if D-07 is in-app. | — | C | L | D-07 |
| BE-09 | P1 | Expo push receipts polling job implemented with token deactivation and ticket cleanup. | `lib/push-receipts.ts`, `communication-service.ts` | C | M | **Done** |
| BE-10 | P1 | Admin API can create, edit and deactivate clinicians, operators, services, vans and clinics. | `routes/admin.ts` | C | M | **Done** |
| BE-11 | P3 | Drop the unused `waitlist_entries` table (reviewed, destructive migration). | `routes/waitlist.ts` | C | S | D-20 |
| BE-12 | P1 | `npm audit`: 6 high in production deps (zod and others). Upgrade and re-run suites. Repeat for app, dashboard, website. | | C | S/M | — |
| BE-13 | P3 | 581 lint warnings; ratchet. | | C | M | — |
| BE-14 | P1 | Key management runbook: generation, storage, rotation and backup of `ENCRYPTION_KEY`, `PRESCRIPTION_SIGNING_KEY`, JWT and HMAC secrets; the `rewrap:encrypted` script exists but no procedure. Real KMS stays optional (decision #18). | `lib/encryption.ts` | C | S | — |
| BE-15 | P1 | Stripe webhook endpoint subscriptions omit `charge.refunded` and `charge.dispute.created`, which the handler supports. Add them on test and production endpoints. | `test-deployment-status.md` §2 | C+P | S | C-04 |
| BE-16 | P2 | Daily meeting tokens: confirm short expiry and `eject_at_token_exp`; token travels in the browser URL. | `routes/video.ts` | C | S | — |
| BE-17 | P1 | Re-audit change sets marked "not re-audited": CS-39 to CS-44, CS-53, CS-54, and the app side of CS-25 to CS-27. | `03-plan.md` | C | M | — |
| BE-18 | P2 | Treatment-plan acceptance record: store what was shown (plan version hash), who, when, device; wording per D-06. | `e2e` "Treatment Plan Cryptographic E-Signature" | C | M | D-06 |
| BE-19 | P2 | Capacity: load test booking, slots and van queue; Supabase pooler settings (`pgbouncer=true`, connection limits); indexes for audit and messages. | | C | M | OPS-01 |
| BE-20 | P1 | Retention job ships with `RETENTION_ENFORCE=false`. Turn on in production after legal sign-off of retention periods. | `.env.example` | C+Legal | S | LG-07 |
| BE-21 | P1 | Added `operator` to `MFA_REQUIRED_ROLES` in auth route. | `routes/auth.ts:31` | C | S | **Done** |

### 4.5 Staff dashboard (DB)

| ID | P | Item | Evidence | Owner | Effort |
|---|---|---|---|---|---|
| DB-01 | P0 | Patients directory is broken: it calls `pavApi.get(...)`, but `pavApi` is a function with no `.get`, so every request throws and returns 500. Added in #69. | `admin-dashboard/src/app/api/v1/admin/patients/route.ts:28` | C | S |
| DB-02 | P0 | `typescript.ignoreBuildErrors: true` hides type errors (5 today, including DB-01). Fix them, remove the flag, add `tsc --noEmit` to CI. | `next.config.mjs` | C | S |
| DB-03 | P1 | Biome lint: 152 errors; add lint to CI. | | C | M |
| DB-04 | P1 | Template demo pages are still reachable by URL and `/dashboard` redirects to the template "default" page with made-up metrics: academy, analytics, calendar, chat, coming-soon, crm, default, ecommerce, file-manager, finance, infrastructure, invoice, kanban, (legacy), logistics, mail, patient-monitoring, productivity, profile, roles, tasks, plus v1/v2 auth pages. Delete them before launch (the owner keeps them as a reference for new screens until then, D-17); build a real home (today's appointments, unread inbox, erasure requests due, failed payments). | `src/app/(main)/dashboard/*`, `next.config.mjs` redirect | C | M |
| DB-05 | P1 | Missing staff screens for app data whose endpoints already exist: app appointments (list, status override, cancel with refund), audit-log viewer, vans and live shifts, edit services/clinicians/operators (needs BE-10), prescriptions register, consent and SAR records. | `routes/admin.ts`; proxy allow-list in `api/v1/admin/app/[...path]/route.ts` | C | L |
| DB-06 | P1 | Global CORS header joins several origins with commas (browsers reject that) while `credentials: true`; per-route CORS differs. One origin check in middleware. | `next.config.mjs` headers | C | S |
| DB-07 | P1 | Replace seeded `@pavdental.com` staff accounts with real staff (codes currently go nowhere). | memory: test environment | P then C | S |
| DB-08 | P2 | Shop: verify checkout, order, refund and stock flows end to end in Stripe test mode; dashboard Stripe keys and webhook for shop orders. | `api/v1/checkout`, `webhooks` | C | M |
| DB-09 | P2 | Dashboard data the AGENTS.md says it owns (shop, blog, newsletter, submissions) has no backup or retention doc. | | C | S |

### 4.6 Website (WS) — *DE-SCOPED*

> [!NOTE]
> Per user instruction (*"you dont have to work on the website remove it from plan too just work on the app"*), all items in this section are removed from the active plan to focus 100% on the mobile application (`pavdental/`).

| ID | P | Item | Evidence | Owner | Effort | Status |
|---|---|---|---|---|---|---|
| WS-01 | P0 | Legal pages missing: privacy, terms, cookies, complaints procedure. | `components/home/footer.tsx:39-41` | C+P+Legal | M | De-scoped |
| WS-02 | P0 | Fabricated social proof: reviews, fixed counters, stock-photo dentists. | `components/home/reviews.tsx`, `team/team-data.ts` | C+P | S | De-scoped |
| WS-03 | P1 | NHS pricing and "CQC-compliant" claims. | `dentures/dentures-faq.tsx:40` | C | S | De-scoped |
| WS-04 | P1 | Grok sandbox leftovers removal. | `website/` | C | M | De-scoped |
| WS-05 | P1 | One sign-in system for shoppers. | `routes/sign-in.tsx`, `lib/auth/` | C | M | De-scoped |
| WS-06 | P0 | Hosting or deploy doc. | `package.json` | C+P | M | De-scoped |
| WS-07 | P2 | Lint errors in website. | | C | S | De-scoped |
| WS-08 | P1 | GA4 cookie consent blocking. | `.env.example`, `cookie-consent.tsx` | C | S | De-scoped |
| WS-09 | P2 | Website booking smart banner / app link. | `components/booking/booking-page.tsx` | C+P | S | De-scoped |
| WS-10 | P2 | Website monitoring & SEO. | | C | M | De-scoped |
| WS-11 | P1 | Host AASA and assetlinks.json. | | C | S | De-scoped |

### 4.7 Tests and CI (QA)

| ID | P | Item | Owner | Effort |
|---|---|---|---|---|
| QA-01 | P1 | Refactored `account.test.ts` to test real `accountApi` and actual HTTP request methods/endpoints rather than an in-memory mock store. | C | M | **Done** |
| QA-02 | P1 | No device end-to-end tests. Add Maestro flows (sign-up, booking with test card, cancel, van request, video intake, delete account) and run them on EAS builds. | C | L |
| QA-03 | P0 | `build-config.test.ts` verifies no invented values and asserts EAS build channels and runtime policies. | C | S | **Done** |
| QA-04 | P1 | CI gaps: dashboard `tsc` + lint, website lint, `expo-doctor`, `npm audit --audit-level=high` per app, Dependabot or Renovate, CodeQL and secret scanning, CODEOWNERS, PR template. Branch protection requiring CI (person enables in GitHub settings). | C+P | M |
| QA-05 | P1 | Deploy pipeline: Render auto-deploys `main` without waiting for CI; no EAS build/submit workflow. Gate Render on CI; add EAS workflows for preview and production. | C | M |
| QA-06 | P2 | 05-audit flagged time-of-day and worker-count flakiness in jest; passed here at ~21:00 UTC with default workers. Add a CI run at a fixed "late" clock (fake timers) to prove it's gone. | C | S |
| QA-07 | P1 | Contract drift between app and API (the insurance fields show it). `shared-types/` is imported by nothing. Generate types from the backend zod response schemas and use them in the app; add a contract test. | C | M |
| QA-08 | P1 | Penetration test against staging (scope doc exists). Paid third party. | P | 2–3 weeks elapsed |
| QA-09 | P1 | Accessibility on devices: run `docs/completion/screen-reader-checklist.md` with VoiceOver and TalkBack; Dynamic Type / font scaling; colour contrast of the new grey palette. | C+P | M |

### 4.8 Infrastructure, deployment and monitoring (OPS)

| ID | P | Item | Owner | Effort |
|---|---|---|---|---|
| OPS-01 | P0 | Production stack per D-10: paid always-on API (background jobs need it), Postgres with PostGIS and point-in-time recovery, Redis with persistence, encrypted object storage, custom domains with TLS, separate secrets from staging. | C+P | L |
| OPS-02 | P1 | Staging: the free Render service sleeps, so reminders, hold expiry and audit monitoring don't run reliably; S3 not configured (uploads lost on deploy). Either a cheap always-on plan or a cron pinger + bucket. | C+P | S |
| OPS-03 | P0 | DNS and email: API, website, dashboard hostnames; SPF/DKIM/DMARC for Postmark; Twilio sender. | P (C writes the records) | S |
| OPS-04 | P1 | Monitoring and alerting: Sentry DSNs in every app with release tracking and source maps; uptime checks on `/readyz`; alerts for audit-integrity failures, webhook failures, push receipt errors, job lag; log drain with retention. | C+P | M |
| OPS-05 | P1 | Backups: runbook exists but no restore drill has been done; Supabase free has no PITR. Do one timed restore into a scratch DB and record it. | C | S |
| OPS-06 | P1 | Secrets hygiene: rotate the seeded demo password (see `cs48/rotate-demo-password.md`), set production secrets fresh, document rotation (BE-14). | P+C | S |
| OPS-07 | P2 | Release command: confirm Render runs `npx prisma migrate deploy` before start; zero-downtime migration rules from `docs/completion/migrations.md`. | C | S |
| OPS-08 | P2 | Incident runbook and on-call contact; status page or in-app banner for outages. | C+P | S |

### 4.9 Legal, clinical and compliance (LG)

| ID | P | Item | Owner | Effort |
|---|---|---|---|---|
| LG-01 | P0 | Privacy notice: legal review of `docs/compliance/privacy-notice-draft.md`, fix processor list (see LG-02), publish on the website (WS-01). | Legal+C | elapsed |
| LG-02 | P0 | DPA tracker is wrong (V-04). Rewrite it to list the real processors (Render, Supabase, Upstash, Vercel, Stripe, Daily, Postmark, Twilio, Sentry, Expo push / APNs / FCM, postcodes.io, Mapbox/OSRM, Firebase/Google if kept) with status "to do"; then you accept each DPA. | C, then P | S + elapsed |
| LG-03 | P0 | DPIA sign-off (`docs/compliance/dpia-draft.md`). | Legal/DPO | elapsed |
| LG-04 | P0 | ICO registration (data protection fee) for the controller. | P | days |
| LG-05 | P0 | CQC: confirm registration covers the clinic(s), domiciliary/van visits and remote consultations; correct the release checklist (V-05). | P | elapsed |
| LG-06 | P1 | Medical device question for triage (D-18). | P + adviser | elapsed |
| LG-07 | P1 | Outstanding clinical sign-offs: confirm V-01; still open: odontogram vocabulary, radiograph handling (IR(ME)R), post-visit advice wording, dependants consent wording, prescription PDF template, triage copy. Retention periods (decision #9) need legal sign-off. | Clin, Legal | elapsed |
| LG-08 | P0 | Patient terms: booking, deposit and cancellation rules (decisions #6, #22), consumer cancellation rights for services booked at a distance, complaints. | Legal+C | M |
| LG-09 | P0 | Remove the finance promotion (TC-04) unless FCA permissions exist. | C | S |
| LG-10 | P0 | Verify team credentials and GDC numbers (V-02, V-03). | P | S |
| LG-11 | P1 | Third-party design captures in the repo and a UI that closely copies another company's app (D-17). Owner keeps the captures as a reference until just before launch, then deletes them. | P | S |
| LG-12 | P2 | Accessibility statement for the website. | C | S |
| LG-13 | P1 | Age rules (D-16) reflected in sign-up validation and store questionnaires. | C | S |
| LG-14 | P1 | DSPT: only needed for NHS work (D-13). Remove claims or complete the toolkit. | P | — |

### 4.10 UX and accessibility polish (UX)

| ID | P | Item | Owner | Effort |
|---|---|---|---|---|
| UX-01 | P2 | Screens restyled in #70 should be checked at 320 pt width and with large text (screenshots exist in `completion/screenshots/`; re-shoot after TC fixes). | C | M |
| UX-02 | P2 | Copy pass: sentence case and plain English across new screens (`toLabel()`), remove leftover marketing tone ("Premier", "state-of-the-art"). | C | S |
| UX-03 | P2 | Empty states for brand-new patients on every tab (no appointments, no records, no messages). | C | S |
| UX-04 | P3 | Haptics and motion respect "Reduce Motion". | C | S |

### 4.11 Repo hygiene and docs (RH)

| ID | P | Item | Owner | Effort |
|---|---|---|---|---|
| RH-01 | P1 | Docs disagree with the code: `03-plan.md` marks change sets done that weren't re-audited; `test-deployment-status.md` shows a `dsptMode` field the API no longer returns and a made-up-looking Stripe key; `release-checklist.md` lists env vars that don't exist (`AUDIT_HMAC_SECRET`, `PRESCRIPTION_SIGNING_SECRET`, `ENCRYPTION_MASTER_KEY`, `POSTMARK_API_TOKEN`) and claims "zero type errors"; root `AUDIT.md`, `MASTER_PLAN.md`, `REQUIREMENTS.md`, `architecture.md`, `code-review-2026-10-03.md` are stale. Archive the stale ones and point `03-plan.md` at this plan. | C | M |
| RH-02 | P2 | Remove `neo-financial-ios/` (D-17), unused `shared-types/` (or adopt it via QA-07), `testsprite_tests/` folders, `skills-lock.json` if unused. | C | S |
| RH-03 | P3 | Dead code: `src/__mocks__`, screen-security stub, `backend/src/smoke-van-payments.ts` if unused. | C | S |
| RH-04 | P2 | Process: several commits and docs claimed "100% green", "signed off" or "authentic" without evidence. Require a "how I verified" section in every PR (template from QA-04). | C | S |

---

## 5. Order of work and milestones

| Milestone | Contents | Claude effort | Waiting on you |
|---|---|---|---|
| **M0 Honest and unbroken** (now) | PRs A–D from section 2 | ~4 days | Nothing |
| **M1 Decisions in** | D-01 to D-22, V-01 to V-07 answered; build the chosen variants (TC/BE/MF follow-ups) | 3–6 days depending on answers | Your answers |
| **M2 Production stack** | OPS-01..07, RB-12, BE-03, BE-14, BE-15, WS-06, DB-07 | ~5 days | D-09, D-10, C-04..C-11, C-13 |
| **M3 Store-ready build** | RB-01..19, QA-02, QA-09, MF-06, MF-08, internal TestFlight / Play internal | ~5 days | C-01..C-03, C-12 |
| **M4 Compliance gate** | LG-01..14, WS-01, WS-02, RB-10, QA-08 | ~3 days of drafting | Legal, clinician, pen test (2–4 weeks elapsed) |
| **M5 Complete product** | DB-04, DB-05, BE-10, QA-01, QA-07, MF-05, remaining P2/P3 | ~2 weeks | — |
| **Submit** | Store submission with reviewer account | — | M3 + M4 done |

Critical path to the stores: **legal/compliance sign-offs (M4) and the Apple/Google organisation accounts (C-01, C-02, D-U-N-S can take 1–2 weeks)**. Start those now in parallel with M0.

## 6. Count

| Area | Items | P0 |
|---|---|---|
| Store/release (RB) | 19 | 12 |
| False claims (TC) | 17 | 8 |
| Mobile (MF) | 9 | 0 |
| Backend (BE) | 21 | 2 |
| Dashboard (DB) | 9 | 2 |
| Website (WS) | 11 | 3 |
| Tests/CI (QA) | 9 | 1 |
| Infra (OPS) | 8 | 2 |
| Legal/clinical (LG) | 14 | 8 |
| UX | 4 | 0 |
| Hygiene (RH) | 4 | 0 |
| **Total** | **125** | **38** |
| Decisions / verifications / credentials | 22 / 7 / 15 | |
