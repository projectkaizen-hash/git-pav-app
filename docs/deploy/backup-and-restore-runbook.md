# Backup and Disaster Recovery Runbook (OPS-05, Gate G4)

This runbook establishes standard operational procedures for database backups, point-in-time recovery (PITR), object storage redundancy, and disaster recovery drills for Pav Dental environments.

> **Architecture Authority**: Per [ADR-0003](../adr/0003-production-topology-and-recovery.md) and [07-architecture-audit.md](../completion/07-architecture-audit.md) (AUD-11), Pav Dental's production stack runs on **Render** (API web service in Frankfurt), **Supabase Pro** (Postgres 16 + PostGIS with PITR add-on in `eu-west-2` London), **Upstash Redis** (EU region), and an **S3-compatible bucket** (UK/EU region with server-side encryption and object versioning). Earlier references to AWS RDS, AWS ECS, and AWS Secrets Manager were retired (decision V-04).

---

## 1. Recovery Objectives and Topology

### 1.1 Non-Functional Recovery Targets (ADR-0003)

| Target | Value | Justification |
|---|---|---|
| **RPO (Recovery Point Objective)** | **≤ 5 minutes** | Maximum allowable data loss. Bookings, deposits, prescriptions, and clinical notes are critical and difficult to reconstruct. |
| **RTO (Recovery Time Objective)** | **≤ 4 hours** | Maximum allowable downtime. The practice can fall back to telephone bookings during service restoration. |
| **API Availability** | **99.5% monthly** | Patients can phone the practice; no clinical emergency decisions depend solely on the app being online. |

### 1.2 Infrastructure Inventory

| Component | Provider / Region | Role in Recovery |
|---|---|---|
| **API Web Service** | Render (Frankfurt) | Stateless Docker container (`backend/Dockerfile`). Deploys automatically with `npx prisma migrate deploy` in pre-deploy. |
| **Relational Database** | Supabase Pro (eu-west-2 / London) | Postgres 16 + PostGIS. Sole persistent store for patient, clinical, appointment, and audit data. PITR enabled. |
| **Ephemeral Cache** | Upstash Redis (EU) | Volatile state only: rate limit counters, temporary slot hold locks, refresh token grace periods, and revocation caches. |
| **Object Storage** | S3-Compatible Bucket (UK/EU) | Clinical documents, photo uploads, generated prescription PDFs, and consent bundles. Versioning and SSE enforced. |

---

## 2. Backup Architecture

### 2.1 Automated Continuous Backups (Supabase PITR)
- **Engine**: PostgreSQL 16 with PostGIS extension.
- **Point-in-Time Recovery (PITR)**: Write-Ahead Logs (WAL) continuously streamed to secure storage, enabling granular restoration to any second within the retention window (7 to 30 days).
- **Physical Snapshots**: Daily base backups taken automatically by Supabase.
- **RPO Guarantee**: Continuous WAL archiving satisfies the ≤ 5 minute RPO objective.

### 2.2 Pre-Migration Logical Backups (`pg_dump`)
Prior to applying destructive or structural database migrations (see [migrations.md](../completion/migrations.md)):
```bash
# Export compressed binary custom-format dump using the DIRECT database connection:
# (Do NOT run pg_dump through the transaction pooler on port 6543)
pg_dump -Fc "$DIRECT_DATABASE_URL" \
  --exclude-table-data="audit_logs_archive" \
  -f "pre_migration_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 3. Database Point-in-Time Recovery (PITR) Procedure

When recovering from data corruption, accidental deletion, or catastrophic database failure:

### Step 1: Identify Target Timestamp
Determine the exact UTC timestamp immediately preceding the incident:
```bash
TARGET_UTC="2026-10-27T10:15:00Z"
```

### Step 2: Execute Point-in-Time Restore in Supabase
Choose the appropriate restoration mode:

#### Mode A: In-Place Point-in-Time Recovery (Production Emergency)
1. Sign in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Project Settings** > **Database** > **Backups** > **Point in Time**.
3. Select **Restore to point in time** and enter `$TARGET_UTC`.
4. Confirm the restore. Supabase will provision a restored cluster from the base backup and replay WAL logs up to the exact target second.
5. Note: The database connection string and credentials remain identical for in-place restore.

#### Mode B: Restore to a New/Scratch Project (Drills & Safe Verification)
1. In Supabase Dashboard, create or select a dedicated recovery/scratch project (e.g. `pavdental-recovery-drill`).
2. Restore the PITR snapshot to the target project using the Supabase Management API or Dashboard restore tool.
3. Obtain the connection string for the recovered instance:
   ```bash
   RESTORED_DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public&connection_limit=5"
   ```

### Step 3: Repoint API Configuration (If Restored to New Project)
If the database was restored to a new Supabase project:
1. Update `DATABASE_URL` in the Render Web Service Environment settings (Frankfurt API service).
2. Ensure connection parameters follow ADR-0003:
   - Port `6543` (transaction pooler) with `connection_limit=5` for runtime API traffic.
   - Port `5432` (direct connection) for migration commands.
3. Trigger a deployment or restart the Render service.

---

## 4. Post-Restore Verification Procedure

Every restored database—whether following a drill or an incident—must pass the following verification steps before receiving production traffic.

Run these commands from the `backend/` directory:

### 4.1 Apply Pending Schema Migrations
Ensure the database schema matches the running API release:
```bash
cd backend
DATABASE_URL="$RESTORED_DIRECT_URL" npx prisma migrate deploy
```
*Expected output*: `No pending migrations to apply.` (or lists applied migrations with zero errors).

### 4.2 Verify Cryptographic Audit Log Chain Integrity
Pav Dental uses a SHA-256 HMAC hash chain for immutable audit logs (`audit_logs.integrity_hash`). Verify that the audit chain on the restored copy is valid and untampered:
```bash
cd backend
DATABASE_URL="$RESTORED_DATABASE_URL" npx tsx -e '
  import { verifyAuditIntegrity } from "./src/lib/audit-integrity";
  verifyAuditIntegrity(1000).then((report) => {
    console.log("Audit chain verification:", report);
    if (!report.valid) {
      console.error("FATAL: Restored database failed audit integrity check!", report.issues);
      process.exit(1);
    }
  });
'
```
*Expected output*:
```json
{
  "valid": true,
  "verified": true,
  "checkedCount": 1000,
  "issues": []
}
```

### 4.3 Verify Background Job Processors
Confirm that slot hold expiry and notification dispatch routines can read and process records against the restored database:
```bash
cd backend
DATABASE_URL="$RESTORED_DATABASE_URL" npx tsx -e '
  import { processExpiredSlotHolds, processDueScheduledNotifications } from "./src/lib/background-jobs";
  Promise.all([processExpiredSlotHolds(), processDueScheduledNotifications()])
    .then(([holds, notifs]) => {
      console.log("Job dry-run succeeded:", { holds, notifs });
    })
    .catch((err) => {
      console.error("FATAL: Background jobs failed on restored DB:", err);
      process.exit(1);
    });
'
```
*Expected output*: Prints counts of processed holds and dispatched notifications without throwing database errors.

### 4.4 Verify API Health and Readiness Check
Verify that the API `/readyz` endpoint responds `200 OK` with database and redis connectivity:
```bash
curl -s -i https://<api-host>/readyz | grep "HTTP/1.1 200 OK"
```

---

## 5. Ephemeral Cache (Redis) Recovery

- **Provider**: Upstash Redis (EU region).
- **Data Held**: Ephemeral keys only (rate limiting buckets, 15-minute slot reservation locks, refresh token grace periods, session revocation caches).
- **Recovery Strategy**:
  - In the event of an Upstash outage or accidental flush: Redis can be restarted cold without persistent data loss.
  - Active appointment bookings, patient records, and clinical data reside permanently in Postgres.
  - Slot holds naturally re-synchronise as users browse or book; rate limits start fresh.
  - If Upstash needs reconfiguration: create a new database in the Upstash console and update `REDIS_URL` in Render.

---

## 6. Object Storage (S3-Compatible Bucket) Recovery

- **Bucket Policy**: Server-Side Encryption (SSE-S3 or SSE-KMS) and **Object Versioning** must be enabled on all production buckets (`S3_BUCKET_NAME`).
- **Accidental Deletion / Overwrite Recovery**:
  - If a file is deleted, S3 writes a Delete Marker without removing historical versions.
  - To recover an accidentally deleted or overwritten clinical document:
    1. Query object versions:
       ```bash
       aws s3api list-object-versions --bucket "$S3_BUCKET_NAME" --prefix "clinical-documents/patient-123/"
       ```
    2. Delete the Delete Marker to restore the object to its previous state:
       ```bash
       aws s3api delete-object --bucket "$S3_BUCKET_NAME" --key "clinical-documents/patient-123/doc.pdf" --version-id "$DELETE_MARKER_VERSION_ID"
       ```
- **Lifecycle Policy**: Noncurrent object versions retained for 90 days before permanent deletion.

---

## 7. Periodic Disaster Recovery Drill Procedure (Quarterly / Pre-Launch)

A disaster recovery drill must be executed every 90 days and recorded against **Gate G4** in `docs/release/release-checklist.md`.

### Drill Protocol
1. **Initiate**: Announce drill start and start timer.
2. **Execute PITR**: Restore the latest production backup into a staging/scratch Supabase project.
3. **Execute Verification**:
   - Run `npx prisma migrate deploy` on direct URL.
   - Run `verifyAuditIntegrity(1000)` test script.
   - Run `processExpiredSlotHolds` / `processDueScheduledNotifications`.
4. **Measure RTO**: Stop timer when verification completes. Measure against the ≤ 4 hour requirement.
5. **Clean up**: Destroy the scratch recovery project.
6. **Log Result**: Record in the table below and update `docs/release/release-checklist.md`.

### Disaster Recovery Drill Log

| Date | Environment | Target Timestamp | Measured RTO | Audit Chain Verified? | Operator | Outcome / Notes |
|---|---|---|---|---|---|---|
| *Pre-launch (Pending)* | Scratch Supabase | TBD | < 4 hours | Yes | Operations | Gate G4 validation drill prior to production launch |
