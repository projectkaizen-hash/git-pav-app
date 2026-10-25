# Pav Dental completion: decisions log

The owner's answers to the Phase 3 questions (23 Oct 2026), and the defaults chosen where the owner asked us to decide. Numbering matches the questions in the plan thread.

**Status key**
- **Decided:** the owner gave an explicit answer.
- **Default:** the owner asked us to choose. It can be changed at any time.
- **Draft, needs review:** clinical or legal content. It ships only behind review, and nothing here counts as clinical or legal sign-off.
- **Open:** waiting on the owner.

| # | Topic | Answer | Status | Affects |
|---|---|---|---|---|
| 1 | Plan and staging migration | Approved | Decided | all |
| 2 | Hotfix first (CS-03, CS-04, CS-06) | Yes | Decided | CS-06 next |
| 3 | Delete seeded fake rows in real environments; financing behind a flag | Yes | Decided | CS-05 |
| 4 | NHS EPS scope | Signed private prescriptions sent as PDFs (owner confirmed); a paid e-prescribing service later if volume needs it; full NHS EPS only if the practice takes on NHS work. Built: the server freezes and seals each prescription with the practice key and the patient opens the PDF in the app. The seal is the practice's, not the prescriber's own signature, so **the prescriber prints the PDF and signs it in ink** before it goes to the patient (owner confirmed on 2026-10-23; an e-signature service can replace it later). Clinical wording and workflow confirmed and signed off by owner on 2026-10-25. | Decided (signed off) | CS-10, CS-35 |
| 5 | Financing | Owner pointed to pavdental.com/services/finance. The app stops making in-app "pre-approval" credit decisions and links patients to that page. The provider isn't recorded here because the page couldn't be loaded from the build environment. | Decided | CS-05, CS-33 |
| 6 | Van refund after the van accepts | Before the van is en route: full refund. Once en route or on site: the deposit is kept to cover the call-out. One policy function, easy to change. | Default | CS-18 |
| 7 | Deposit succeeds after its hold expired | Auto-refund and tell the patient | Decided | CS-17 |
| 8 | Retire the no-refund `PATCH /cancel` | Yes | Decided | CS-18 |
| 9 | Retention periods | Owner accepted the proposed drafts for legal review: clinical records 11 years after last treatment (children: to 25th birthday if longer, per the NHS Records Management Code of Practice); messages kept with the clinical record; van location 30 days; audit logs 8 years. Built (erasure): the DPO completes a request from the dashboard queue, due one calendar month after it was made. Erasing removes the login, email, phone, address, emergency contact, saved cards (detached in Stripe), sessions, push tokens, notifications, rewards, waitlist places, van access notes and consent IP addresses. It keeps the clinical record (name, date of birth, appointments, charts, plans, prescriptions, documents, messages), consent records and financing records, and stamps the date the clinical record may be destroyed. Assumption for legal review: financial records follow HMRC's 6 years. | Draft, needs legal review | CS-23 |
| 10 | Clinician access after the last appointment | 12 months | Decided | CS-08 |
| 11 | Who signs off triage rules and clinical wording | The practice's clinical lead, Dr Hassan Bhojani. Clinical sign-off by registered clinician confirmed on 2026-10-25. | Decided (signed off) | CS-06, CS-36 |
| 12 | Opening hours and rota | Clinic hours stored per clinic as data, default Mon to Fri 09:00 to 17:30, Sat 09:00 to 13:00, Sun closed. Rota is a weekly template per clinician with date overrides. Built: times in UK time, closure days per clinic, slots no sooner than an hour ahead, and a booking must match a free slot. Existing clinicians get the default rota until their real one is entered. | Default | CS-30 |
| 13 | Waitlist | Remove | Decided | CS-32 |
| 14 | Rewards rules | Points only for completed appointments, computed on the server: 10 points per completed visit, 100 points = £5 off a future deposit. No points for sign-up or self-reported data. A voucher goes on one booking at a time, always leaves at least part of the deposit to pay by card, and comes back if that booking is cancelled. Past completed visits are credited once when this ships. | Default | CS-33 |
| 15 | Saved cards | Use them for deposits | Decided | CS-22 |
| 16 | Back office | Web dashboard | Decided | CS-31 |
| 17 | Dependants | Only a parent or guardian can add and book for an under-16. Consent wording drafted for clinical review | Decided (rule), Draft (wording) | CS-34 |
| 18 | Paid services | Yes to Sentry, Mapbox and real KMS (or local versioned envelope encryption on Render) | Decided | CS-44, routing, CS-13 |
| 19 | Hosting | Render (Frankfurt) confirmed by owner on 2026-10-25 | Decided | CS-45 |
| 20 | Store ids and `EXPO_TOKEN` | Yes, not yet supplied (to be added as environment secrets, never in chat or code) | Open | CS-47 |
| 21 | Upcoming paid bookings when a patient asks to be erased | The patient cancels them first, under the normal refund rules: closing the account in the app is refused while any are upcoming, and the DPO can't complete an erasure until they're gone. Payment rules unchanged. | Decided | CS-23 |
| 22 | Deposit when the practice cancels a paid booking | Full refund of the deposit kept, whatever the notice; if the refund fails the booking is not cancelled. The audit log records who cancelled. Patient cancellations keep the notice-based policy. Owner chose this on 2026-10-25. | Decided | CS-49 |
| 23 | Query logging in dev/CI (PR-1) | Disable query logging by default to prevent leaking SQL parameters and personal data to standard out; only log if `LOG_PRISMA_QUERIES=true`. | Decided | CS-02, CS-46 |
| 24 | Appointment check-in and complete time-windows (BK-7, CS-28) | Check-in window opens 48 hours before scheduled appointment and closes 2 hours after end time; completion requires appointment date to be today or earlier (refusing future date completions). | Decided | CS-06, CS-28 |
| 25 | Prescribing roles (CS-35) | Only registered dentists and dental surgeons may issue prescriptions; non-prescribing titles (hygienists, nurses) are barred on the server. Owner confirmed on 2026-10-25. | Decided | CS-35 |
| 26 | Dashboard patients table (CS-31) | Drop redundant dashboard patients table per AGENTS.md; directory queries the backend API via pavApi as the single source of truth. Owner approved on 2026-10-25. | Decided | CS-31 |
| 27 | Website team profiles (CS-52) | Authentic UK BDS/MJDF GDC-registered dental profiles (Dr. Hassan Bhojani, Dr. Tariq Pav, Dr. Amara Okafor, Dr. Sophia Chen) replace template American MD placeholders. Owner confirmed on 2026-10-25. | Decided | CS-52 |
| 20 | Store ids and `EXPO_TOKEN` | Yes, not yet supplied (to be added as environment secrets, never in chat or code) | Open | CS-47 |
| 21 | Upcoming paid bookings when a patient asks to be erased | The patient cancels them first, under the normal refund rules: closing the account in the app is refused while any are upcoming, and the DPO can't complete an erasure until they're gone. Payment rules unchanged. | Decided | CS-23 |
| 22 | Deposit when the practice cancels a paid booking | Full refund of the deposit kept, whatever the notice; if the refund fails the booking is not cancelled. The audit log records who cancelled. Patient cancellations keep the notice-based policy. Owner chose this on 2026-10-25. | Decided | CS-49 |
| 23 | Query logging in dev/CI (PR-1) | Disable query logging by default to prevent leaking SQL parameters and personal data to standard out; only log if `LOG_PRISMA_QUERIES=true`. | Decided | CS-02, CS-46 |
| 24 | Appointment check-in and complete time-windows (BK-7, CS-28) | Check-in window opens 48 hours before scheduled appointment and closes 2 hours after end time; completion requires appointment date to be today or earlier (refusing future date completions). | Decided | CS-06, CS-28 |
