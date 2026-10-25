# Penetration Testing Scoping Document

**Target Application:** Pav Dental Production Ecosystem  
**Target Environment:** Staging & Pre-Production Testing Environment  
**Methodology Standards:** CREST, OWASP Top 10 API Security (2023), OWASP Mobile Top 10 (2024), OWASP Application Security Verification Standard (ASVS 4.0 Level 2)  
**Date:** 25 October 2026

---

## 1. Scope & Target Assets

The penetration test encompasses grey-box testing across all four applications in the monorepo:

| Asset Name | Type | URL / Identifier | In Scope | Primary Test Focus |
|---|---|---|---|---|
| **Pav Dental Backend API** | REST API Gateway | `https://staging-api.pavdental.com` | YES | Auth bypass, RBAC privilege escalation, SQLi / PostGIS injection, rate-limit bypassing, tamper-chain audit verification |
| **Pav Dental Mobile App (iOS)** | Native App (.ipa / TestFlight) | `com.pavdental.app` | YES | Biometric authentication bypass, local secure storage inspection, token extraction, deep-link injection |
| **Pav Dental Mobile App (Android)** | Native App (.apk / Internal Track) | `com.pavdental.app` | YES | Insecure data storage, keystore analysis, intent manipulation, root detection resilience |
| **Admin Dashboard** | Web Application | `https://staging-admin.pavdental.com` | YES | Staff token purpose enforcement, SSRF, CSRF, unauthorized patient record queries |
| **Public Marketing & Shop** | Web Application | `https://staging.pavdental.com` | YES | E-commerce cart manipulation, Stripe webhook forgery, auth session fixation |

### Out of Scope
- Third-party cloud service providers (AWS infrastructure, Stripe, Daily.co, Twilio, Postmark physical data centres).
- Denial of Service (DoS/DDoS) stress testing exceeding 500 req/sec that could disrupt testing infrastructure.
- Social engineering or phishing of Pav Dental staff members.

---

## 2. Specific Security Test Scenarios & Objectives

### 2.1 Multi-Tenant Isolation & Role Escalation
- **Patient → Patient Isolation:** Attempt to access, modify, or download appointments, treatment plans, odontogram history, or document vault files of another patient via IDOR (Insecure Direct Object Reference).
- **Patient → Clinician / Staff Escalation:** Attempt to call restricted `/api/clinician/*` or `/api/admin/*` endpoints using a valid patient JWT. Verify that token purpose claims (`staff_session` vs `shopper_session`) fail-closed.
- **Clinician Scope Enforcement:** Verify that a registered clinician cannot view clinical records or issue prescriptions for patients outside their active appointment context.

### 2.2 Cryptographic & Signature Integrity
- **Prescription Ed25519 Signatures:** Attempt to forge or replay electronic prescription JSON content with invalid or modified signatures.
- **Audit Hash-Chain Tampering:** Test whether modifying historical audit log rows or omitting an entry trips the SHA-256 HMAC hash-chain verification detector.
- **Envelope Encryption Verification:** Verify that raw database queries to `patient_profiles` and `appointment_notes` yield encrypted ciphertext and that decryption fails without authorized KMS context.

### 2.3 Mobile Application Security
- **Biometric Lock Tamper Testing:** Attempt to bypass the app-lock screen via background lifecycle race conditions, deep links (`pavdental://`), or emulator instrumentation.
- **Secure Storage Analysis:** Verify that auth tokens and user secrets are stored exclusively in iOS Keychain (`Expo SecureStore`) and Android KeyStore with hardware encryption, and never written to unencrypted `AsyncStorage` or world-readable files.
- **PHI Log Scrubbing:** Monitor device console and network proxies to confirm zero patient personal health data (PHI), GDC numbers, or clinical notes leak to logging channels.

### 2.4 Payment & Booking Logic Integrity
- **Capture Racing:** Attempt to trigger concurrent appointment cancellations during Stripe payment intent capture to test distributed lock integrity.
- **Voucher Manipulation:** Test edge cases on reward discount voucher application (negative values, reuse of redeemed vouchers, concurrent usage across sessions).

---

## 3. Test Accounts & Provisioning

Testing will be executed with pre-provisioned synthetic test accounts:
1. `pen-test-patient-1@example.test` (Role: patient)
2. `pen-test-patient-2@example.test` (Role: patient - isolation target)
3. `pen-test-clinician@example.test` (Role: clinician - GDC #999001)
4. `pen-test-operator@example.test` (Role: operator - Van #1)
5. `pen-test-admin@example.test` (Role: admin)

All test records are tagged with synthetic markers to prevent any confusion with clinical data.

---

## 4. Deliverables & Reporting
The external penetration testing partner will provide:
1. Executive Summary detailing overall posture and business risk.
2. Technical Vulnerability Register with CVSS v3.1 scoring, proof-of-concept exploits, and step-by-step remediation guidance.
3. Verification Retest Report confirming closure of all identified High and Critical findings.
