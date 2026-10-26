# Cryptographic Key Management and Rotation Runbook (BE-14, OPS-06)

This runbook documents the generation, storage, rotation, and backup procedures for all cryptographic keys and application secrets used by the Pav Dental API.

All environment variable names in this runbook match the schema enforced by [`backend/src/config/env.ts`](../../backend/src/config/env.ts).

---

## 1. Secret and Key Inventory

| Variable Name | Purpose | Format / Algorithm | Min Length / Type | Validated In |
|---|---|---|---|---|
| `ENCRYPTION_KEY` | Master Key Encryption Key (KEK derivation) for envelope-encrypted clinical data (van access codes, gate codes, PHI notes) | 256-bit random string / hex / base64 | ≥ 32 characters | `validateDeployedConfig` |
| `KMS_KEY_ID` | Logical key label / version identifier stored in encrypted records as AAD | URI string (e.g. `arn:aws:kms:...` or version tag `v2`) | String | `lib/encryption.ts` |
| `PRESCRIPTION_SIGNING_KEY` | Private key for cryptographically signing NHS/private dental prescriptions | Ed25519 PKCS#8 DER encoded in Base64 | 64-char Base64 string | `deployedServiceGaps` & `prescription-document.ts` |
| `JWT_ACCESS_SECRET` | Signing patient and clinician short-lived access tokens (15m expiry) | High-entropy random string | ≥ 32 characters | `validateDeployedConfig` |
| `JWT_REFRESH_SECRET` | Signing patient and clinician long-lived refresh tokens (30d expiry) | High-entropy random string | ≥ 32 characters | `validateDeployedConfig` |
| `AUDIT_IP_HMAC_SECRET` | Keyed HMAC-SHA256 pseudonymisation for patient/staff IP addresses | High-entropy random string | ≥ 32 characters | `validateDeployedConfig` |
| `AUDIT_HMAC_SECRET` | Keyed HMAC-SHA256 cryptographic chaining for immutable audit logs (`audit_logs.integrity_hash`) | High-entropy random string (defaults to `AUDIT_IP_HMAC_SECRET` if unset) | ≥ 32 characters | `lib/audit-integrity.ts` |
| `STRIPE_SECRET_KEY` | Stripe API communications (payments, deposits) | `sk_test_...` (staging) or `sk_live_...` (production) | Valid Stripe key | `validateDeployedConfig` |
| `STRIPE_WEBHOOK_SECRET` | Verifying inbound Stripe webhook signatures | `whsec_...` | Valid Stripe webhook secret | `validateDeployedConfig` |
| `POSTMARK_SERVER_TOKEN` | Sending transactional emails (login codes, receipts, invites) | UUID string from Postmark | Valid token | `deployedServiceGaps` |
| `DAILY_API_KEY` | Generating Daily.co video consultation rooms and short-lived tokens | High-entropy string from Daily | Valid token | `deployedServiceGaps` |
| `TWILIO_AUTH_TOKEN` | Sending SMS verification codes via Twilio | 32-char hex token from Twilio | Valid token | `deployedServiceGaps` |

---

## 2. Key Generation Procedures

Generate all keys in an offline, secure terminal session using standard Node.js crypto primitives.

### 2.1 Master Envelope Encryption Key (`ENCRYPTION_KEY`)
Generates 32 cryptographically secure random bytes (256 bits) as a hexadecimal string:
```bash
node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
```

### 2.2 Private Prescription Signing Key (`PRESCRIPTION_SIGNING_KEY`)
Generates an Ed25519 key pair, exporting the private key in PKCS#8 DER format and encoding it in Base64:
```bash
node -e '
  const crypto = require("crypto");
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  const base64Key = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
  console.log(base64Key);
'
```
*Validation check*:
```bash
node -e '
  const crypto = require("crypto");
  const key = crypto.createPrivateKey({ key: Buffer.from(process.env.PRESCRIPTION_SIGNING_KEY, "base64"), format: "der", type: "pkcs8" });
  if (key.asymmetricKeyType !== "ed25519") throw new Error("Invalid key type");
  console.log("Valid Ed25519 key verified.");
'
```

### 2.3 JWT and HMAC Secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AUDIT_IP_HMAC_SECRET`, `AUDIT_HMAC_SECRET`)
Generate distinct 32-byte (64 hex characters) secrets for each secret:
```bash
# JWT Access Secret
node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'

# JWT Refresh Secret
node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'

# Audit IP Pseudonymisation & Audit HMAC Secret
node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
```

---

## 3. Secret Storage and Access Control

### 3.1 Production Runtime Storage
- All secrets are injected exclusively as environment variables into the **Render** dashboard under the production API service settings.
- Never commit `.env` or secret files to Git. `.env*` files are strictly ignored (except `.env.example`, which contains non-sensitive placeholders only).
- Never log, paste, or print secret values in pull requests, issues, chat channels, or terminal logs.

### 3.2 Secure Offline Backup (Disaster Recovery)
- In accordance with GDPR Article 32 (Security of Processing), production master keys and signing keys must be backed up to an encrypted, access-controlled vault (e.g. Practice 1Password / Bitwarden vault with MFA enforced).
- Access to the vault is restricted to the practice owner and authorised operations leads.

---

## 4. Key Rotation Procedures

### 4.1 Master Clinical Encryption Key Rotation (`ENCRYPTION_KEY` & `KMS_KEY_ID`)

Pav Dental uses AES-256-GCM envelope encryption. Every encrypted database row stores the `keyId` it was encrypted with. Old records remain decryptable under their existing derivation even if `KMS_KEY_ID` or `ENCRYPTION_KEY` changes.

To rotate the master key and re-encrypt historical data:

1. **Take a Database Backup**:
   Follow [backup-and-restore-runbook.md](./backup-and-restore-runbook.md) to take a logical dump or trigger a Supabase PITR point.
2. **Generate New Master Key & Key ID**:
   Generate a new 32-byte `ENCRYPTION_KEY` and define a new `KMS_KEY_ID` version tag (e.g. `arn:aws:kms:eu-west-2:000000000000:key/pavdental-clinical-v3`).
3. **Execute Dry-Run Re-wrap**:
   Before updating production traffic, run the rewrap script in dry-run mode to inspect records requiring re-wrapping:
   ```bash
   cd backend
   npm run rewrap:encrypted
   ```
   *Expected output*: `{"apply":false,"scanned":N,"needingRewrap":N,"rewrapped":0,"failed":0}`
4. **Deploy New Environment Variables**:
   Update `ENCRYPTION_KEY` and `KMS_KEY_ID` in the Render service settings and restart.
5. **Apply Re-wrap Execution**:
   Run the rewrap script with `--apply` to re-encrypt records using the new active KEK:
   ```bash
   cd backend
   npm run rewrap:encrypted -- --apply
   ```
   *Expected output*: `{"apply":true,"scanned":N,"needingRewrap":0,"rewrapped":N,"failed":0}`
6. **Verify Clean Status**:
   Re-run dry-run to confirm zero remaining records need re-wrapping:
   ```bash
   npm run rewrap:encrypted
   ```
   *Expected output*: `needingRewrap: 0, failed: 0`.

### 4.2 JWT Secrets Rotation (`JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`)

Rotating JWT secrets immediately invalidates all active user sessions and refresh tokens across mobile and web clients.

1. **Schedule Maintenance / Notify Users**: Choose an off-peak maintenance window (e.g. during London quiet hours, 22:00–08:00).
2. **Generate New Secrets**: Generate new values for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
3. **Update Render Settings**: Set the new values in Render and restart the API service.
4. **Expected Client Behavior**:
   - Patients and staff will receive a `401 Unauthorized` on their next authenticated request.
   - Mobile and dashboard apps will prompt users to re-authenticate cleanly via SMS OTP or email sign-in code.

### 4.3 Prescription Signing Key Rotation (`PRESCRIPTION_SIGNING_KEY`)

Prescriptions in Pav Dental are digitally signed by the prescriber and stored with a cryptographic signature and key identifier (`keyId`).

1. **Generate New Ed25519 Key Pair**: Generate a new base64 PKCS#8 private key as shown in Section 2.2.
2. **Deploy to Render**: Update `PRESCRIPTION_SIGNING_KEY` in the Render environment variables.
3. **Verification**:
   - Historic prescriptions remain verifiable because their signature records preserve the issuing `keyId`.
   - New prescriptions will automatically be signed with the new private key.
   - Run verification test suite to ensure signature continuity:
     ```bash
     cd backend
     npx jest src/__tests__/prescription-pdf.test.ts
     ```

### 4.4 Audit HMAC Secret Rotation (`AUDIT_HMAC_SECRET` / `AUDIT_IP_HMAC_SECRET`)

Audit records use HMAC-SHA256 hash chains (`audit_logs.integrity_hash`).

1. Rotating `AUDIT_HMAC_SECRET` creates a new cryptographic epoch in the audit log chain.
2. Before rotating, run a full integrity check on historical logs:
   ```bash
   cd backend
   npx tsx -e '
     import { verifyAuditIntegrity } from "./src/lib/audit-integrity";
     verifyAuditIntegrity(5000).then(r => console.log(r));
   '
   ```
3. Update `AUDIT_HMAC_SECRET` in Render.
4. Record an audit log entry documenting the key rotation with the operator's ID and timestamp.

---

## 5. Compromised Key Incident Response

If an API secret or private key is suspected of being compromised:

1. **Isolate**: If an external provider key (Stripe, Twilio, Postmark, Daily) is compromised, immediately revoke it in the vendor dashboard and provision a replacement.
2. **Rotate Secrets**: Rotate the affected key immediately in Render and restart the API.
3. **Revoke Active Sessions**: If `JWT_SECRET` was leaked, rotate both `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to invalidate all active JWTs.
4. **Re-wrap Clinical Records**: If `ENCRYPTION_KEY` was compromised, immediately rotate `ENCRYPTION_KEY` and run `npm run rewrap:encrypted -- --apply`.
5. **Audit Chain Verification**: Run `verifyAuditIntegrity()` to assess whether audit logs were tampered with.
6. **Regulatory Reporting**: If personal or clinical data was exposed in plaintext, notify the practice Data Protection Officer (DPO) and evaluate reporting obligations to the UK Information Commissioner's Office (ICO) within 72 hours under GDPR Article 33.
