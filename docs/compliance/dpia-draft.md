# Data Protection Impact Assessment (DPIA) — Draft for Legal Review

**Organisation:** Pav Dental Ltd  
**Project:** Pav Dental Mobile Dentistry, Tele-Dentistry & Back-Office Platform  
**Document Version:** 1.0 (Draft for DPO & Legal Sign-off)  
**Date:** 25 October 2026  
**Applicable Regulations:** UK General Data Protection Regulation (UK GDPR), Data Protection Act 2018 (DPA 2018), NHS Data Security and Protection Toolkit (DSPT), Access to Health Records Act 1990, General Dental Council (GDC) Standards.

---

## 1. System Overview & Context

Pav Dental operates a modern dental care platform delivering in-clinic appointments, mobile dental van home/office visits, and video tele-dentistry consultations. The technical monorepo comprises four applications:
1. `backend/`: Express API gateway with PostgreSQL (PostGIS) and Redis. Sole owner of patient records and clinical health data.
2. `pavdental/`: Expo/React Native mobile application for patients, clinicians, and mobile van operators.
3. `website/`: Public marketing website and oral care shop.
4. `admin-dashboard/`: Staff back-office portal connecting strictly via authenticated API proxy to the backend.

---

## 2. Personal & Special Category Data Flow

### 2.1 Categories of Data Processed
- **Basic Personal Data (Art. 6):** Full name, date of birth, residential address, UK postcode, telephone number, email address, emergency contact name and phone.
- **Special Category Health Data (Art. 9(2)(h)):**
  - Dental medical history (allergies, medical conditions, current medications, GP surgery details).
  - Digital odontograms (32-tooth condition charting, surface restorations, periodontal flags).
  - Treatment estimates and signed plans.
  - Electronic prescriptions (medication, dosage, duration, GDC prescriber signature).
  - Clinical examination notes and diagnoses.
  - Diagnostic intraoral photographs and triage records.
  - Tele-dentistry audio/video streams during virtual consultations.
- **Location & Operational Data:**
  - Patient postcode for van service-area verification and route planning.
  - Real-time mobile van GPS coordinates during active clinician shifts.

### 2.2 Lawful Bases for Processing
1. **Article 6(1)(b) (Contractual Necessity):** Processing patient details, bookings, payments, and addresses necessary to deliver scheduled dental services.
2. **Article 9(2)(h) (Health and Social Care):** Processing special category clinical data necessary for the provision of healthcare or treatment by or under the responsibility of GDC-regulated dental practitioners subject to professional confidentiality.
3. **Article 6(1)(c) (Legal Obligation):** Retention of patient dental records under GDC Standards and NHS regulations (11 years for adults; until age 25 for paediatric patients).
4. **Article 6(1)(f) (Legitimate Interests):** Cryptographic audit log hash-chaining to safeguard medical records against tampering or unauthorized modification.

---

## 3. Specific Third-Party Integrations & Sub-Processors (DPIA Notes)

### 3.1 Postcode Geocoding (`postcodes.io` — GE-1 Documentation)
- **Data Transferred:** Outward and inward postcode only (e.g. `SW1A 1AA`). No patient names, building numbers, or clinical data are ever sent.
- **Purpose:** Converting UK postcodes to latitude/longitude coordinates to check whether the patient's address falls within authorized mobile van service polygons.
- **Security & Reliability:**
  - The request uses HTTPS with a strict 3,000ms timeout.
  - If the external API fails or times out, the system skips strict centroid distance checks rather than denying patient service.
  - In automated CI and e2e testing, calls to `postcodes.io` are intercepted via local stubs (`test/stubs/external-fetch.mjs`), ensuring zero external egress.
- **Privacy Assessment:** Postcode strings alone in transit to a public geocoding lookup do not identify a specific natural person. Risk is categorized as **Low**.

### 3.2 Video Consultations (`Daily.co`)
- **Data Transferred:** WebRTC real-time media streams between patient and clinician.
- **Security:** Peer-to-peer WebRTC connections are encrypted with DTLS-SRTP. Private ephemeral meeting rooms are generated on demand with 15-minute token expiry. Rooms are closed immediately upon consultation termination.
- **Retention:** Video consultations are not recorded to disk unless explicit, separate informed consent is captured.

### 3.3 Payments (`Stripe`)
- **Data Transferred:** Cardholder details (handled entirely via Stripe SDK client-side tokenization). The backend only receives and stores the Stripe `payment_intent_id` and `customer_id`.
- **Compliance:** PCI-DSS Level 1 certified processor. No primary account numbers (PAN) touch Pav Dental infrastructure.

### 3.4 Storage & Encryption (`AWS S3 & AWS KMS`)
- **Document Vault:** Patient radiographs, prescriptions, and GDPR Subject Access Request (SAR) bundles are stored in an encrypted private S3 bucket.
- **Access:** S3 objects are accessible solely through short-lived signed URLs (15-minute expiration) generated by the authenticated API.
- **At-Rest Encryption:** Clinical notes, triage data, and sensitive medical fields are encrypted at rest using AES-256-GCM envelope encryption managed via AWS Key Management Service (KMS).

---

## 4. Privacy & Security Measures Implemented

1. **Cryptographic Prescription Signatures:** Prescriptions are compiled into standardized PDFs and digitally signed using Ed25519 private keys held by the issuing clinician, verifiable by dispensing pharmacies.
2. **Immutable Audit Logging (AU-1 to AU-6):** Every access, view, modification, or export of clinical records generates an append-only audit entry linked into a SHA-256 / HMAC hash chain with automated continuous integrity monitoring.
3. **Strict RBAC & Least Privilege:**
   - Patients can only access their own appointments, plans, and vault documents.
   - Clinicians can only view medical records for patients with an active appointment context on the day of care.
   - Mobile operators cannot view clinical notes or prescription details.
   - Staff back-office access requires verified multi-factor authentication (MFA).
4. **Log & Error Hygiene:** All error monitoring (Sentry) and server logs strip emails, phone numbers, postcodes, session tokens, and clinical diagnosis parameters.
5. **App Lock & Biometric Protection (MA-3):** Mobile app implements biometric authentication (Face ID / Touch ID / Device Passcode) with cold-start fail-closed locking and automatic background timeout relocking.
6. **Data Subject Rights:**
   - Full automated SAR export bundle generated in JSON format on demand.
   - Deletion requests soft-delete user authentication while retaining required clinical records under GDC legal retention locks (`retainUntil`).

---

## 5. DPO Conclusion & Recommendation

The residual risk to patient rights and freedoms is evaluated as **Low**. The technical and organisational measures implemented provide state-of-the-art protection for special category health data.

**Sign-off:**
- Data Protection Officer: __________________________ Date: ______________
- Clinical Director: ______________________________ Date: ______________
