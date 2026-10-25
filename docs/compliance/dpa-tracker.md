# Third-Party Data Processing Agreement (DPA) Tracker

**Last Updated:** 25 October 2026  
**Compliance Standard:** UK GDPR Article 28, NHS Data Security and Protection Toolkit (DSPT)

Under Article 28 of the UK GDPR, Pav Dental Ltd (Data Controller) must enter into binding written contracts with all sub-processors handling personal or clinical data on our behalf.

---

## Processor Audit & DPA Status

| Processor | Service Provided | Data Categories | Hosting Location | Transfer Mechanism | Security Certification | DPA Status | Annual Review Due |
|---|---|---|---|---|---|---|---|
| **Stripe Payments Europe, Ltd** | Payment processing & card deposit capture | Patient name, billing address, card tokens, transaction amounts | UK / EU / US | UK International Data Transfer Addendum (IDTA) / SCCs | PCI-DSS Level 1, SOC 1/2 Type II | Executed (Standard Online DPA) | 2027-10-01 |
| **Amazon Web Services (AWS EMEA SARL)** | Cloud database (RDS Postgres), cache (ElastiCache), document storage (S3), encryption keys (KMS) | Full database (encrypted at rest), patient vaults, clinical attachments | UK (London region `eu-west-2`) | Data remains within UK. AWS GDPR DPA + UK Addendum | ISO 27001, ISO 27017, ISO 27018, SOC 1/2/3, NHS DSPT Standards Met | Executed (AWS Customer DPA with UK Addendum) | 2027-10-01 |
| **Daily.co (Pluot PBC)** | Real-time WebRTC tele-dentistry video consultations | Consultation audio/video media streams, ephemeral room IDs | UK / EU edge servers; P2P encrypted | UK SCCs / Standard Contractual Clauses | HIPAA BAA available, SOC 2 Type II | Executed (Enterprise DPA + BAA) | 2027-10-01 |
| **Twilio Ireland Ltd / Twilio Inc.** | SMS dispatch for multi-factor authentication (MFA) and verification codes | Patient mobile telephone number, 6-digit numeric OTP | UK / EU routing | UK International Data Transfer Addendum | ISO 27001, SOC 2 Type II | Executed (Twilio Data Protection Addendum) | 2027-10-01 |
| **Postmark (ActiveCampaign LLC)** | Transactional email dispatch (booking confirmations, receipt notices, password resets) | Patient name, email address, appointment time and clinic location (no clinical diagnosis) | US / EU | UK SCCs with Supplementary Measures (TLS in transit, zero PHI policy) | SOC 2 Type II | Executed (ActiveCampaign DPA) | 2027-10-01 |
| **Functional Software, Inc. (Sentry)** | Application performance diagnostics & error monitoring | Anonymised error stack traces (scrubbed of emails, phone numbers, tokens, postcodes, diagnosis) | EU (Frankfurt) / US | UK SCCs + Custom PII Scrubber SDK rules | SOC 2 Type II, ISO 27001 | Executed (Sentry DPA with Data Scrubbing Addendum) | 2027-10-01 |

---

## Technical Safeguards Verified
1. **Zero Health Data in Communications:** Postmark and Twilio dispatches are restricted to administrative metadata (date, time, clinic address) and security codes. Clinical services and diagnosis details are strictly excluded from SMS and email payloads.
2. **Client-Side Tokenization:** No raw payment credentials or PANs touch Pav Dental servers; all card data is tokenized directly between the client SDK and Stripe's PCI-DSS Level 1 infrastructure.
3. **AWS KMS Customer Managed Keys:** All document vault assets and sensitive database columns are protected with AWS KMS keys owned by Pav Dental, preventing unauthorized provider access.
4. **Local Sub-Processor Stubs in Testing:** Automated test suites run in isolated network namespaces with zero external network dependencies, ensuring test data never reaches third-party APIs.
