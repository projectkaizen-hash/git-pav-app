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
| 4 | NHS EPS scope | "Yes", with no option chosen. Proposed: signed PDF prescriptions for now | Open | CS-35 |
| 5 | Financing | Owner pointed to pavdental.com/services/finance. The app stops making in-app "pre-approval" credit decisions and links patients to that page. The provider isn't recorded here because the page couldn't be loaded from the build environment. | Decided | CS-05, CS-33 |
| 6 | Van refund after the van accepts | Before the van is en route: full refund. Once en route or on site: the deposit is kept to cover the call-out. One policy function, easy to change. | Default | CS-18 |
| 7 | Deposit succeeds after its hold expired | Auto-refund and tell the patient | Decided | CS-17 |
| 8 | Retire the no-refund `PATCH /cancel` | Yes | Decided | CS-18 |
| 9 | Retention periods | "Yes", with no periods given. Proposed: clinical records 11 years after last treatment (children: to 25th birthday if longer, per the NHS Records Management Code of Practice); messages kept with the clinical record; van location 30 days; audit logs 8 years | Draft, needs legal review | CS-23 |
| 10 | Clinician access after the last appointment | 12 months | Decided | CS-08 |
| 11 | Who signs off triage rules and clinical wording | Proposed: the practice's clinical lead (name needed). Until then, the app uses neutral, non-diagnostic wording and drops "24/7 AI" claims. | Open (name), Default (interim wording) | CS-06, CS-36 |
| 12 | Opening hours and rota | Clinic hours stored per clinic as data, default Mon to Fri 09:00 to 17:30, Sat 09:00 to 13:00, Sun closed. Rota is a weekly template per clinician with date overrides. | Default | CS-30 |
| 13 | Waitlist | Remove | Decided | CS-32 |
| 14 | Rewards rules | Points only for completed appointments, computed on the server: 10 points per completed visit, 100 points = £5 off a future deposit. No points for sign-up or self-reported data. | Default | CS-33 |
| 15 | Saved cards | Use them for deposits | Decided | CS-22 |
| 16 | Back office | Web dashboard | Decided | CS-31 |
| 17 | Dependants | "Yes", with no limits given. Proposed: under-16s can only be added and booked by a parent or guardian; consent wording drafted for clinical review | Draft, needs review | CS-34 |
| 18 | Paid services | Yes to Sentry, Mapbox and real KMS | Decided | CS-44, routing, CS-13 |
| 19 | Hosting (AWS eu-west-2?) | "Maybe" | Open | CS-45 |
| 20 | Store ids and `EXPO_TOKEN` | Yes, not yet supplied (to be added as environment secrets, never in chat or code) | Open | CS-47 |
