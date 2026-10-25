# Backup and Disaster Recovery Runbook (CS-45)

This runbook establishes standard operational procedures for database backups, point-in-time recovery (PITR), object storage redundancy, and periodic disaster recovery drills for Pav Dental environments.

---

## 1. Database Backup Architecture

### 1.1 Automated Continuous Backups (AWS RDS / Managed Postgres)
- **Engine**: PostgreSQL 16 with PostGIS extension.
- **Automated Snapshots**: Daily automated snapshot retained for 35 days.
- **Point-in-Time Recovery (PITR)**: Write-Ahead Logs (WAL) archived to encrypted S3 continuously, enabling 5-minute RPO (Recovery Point Objective).
- **Encryption**: KMS-managed customer master key (CMK) covering database storage, automated backups, and read replica WAL streams.

### 1.2 On-Demand Logical Backups (`pg_dump`)
Prior to applying major schema migrations:
```bash
# Export compressed binary custom-format dump
pg_dump -Fc -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  --exclude-table-data="audit_logs_archive" \
  -f "pre_migration_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 2. Point-in-Time Recovery (PITR) Procedure

1. **Identify Target Timestamp**:
   Determine the target UTC timestamp immediately prior to the incident or data inconsistency:
   ```bash
   TARGET_TIME="2026-10-25T11:00:00Z"
   ```

2. **Launch Restored Instance**:
   - In AWS RDS Console / CLI:
     ```bash
     aws rds restore-db-instance-to-point-in-time \
       --source-db-instance-identifier pavdental-production-pg \
       --target-db-instance-identifier pavdental-recovery-pg \
       --restore-time "$TARGET_TIME" \
       --db-subnet-group-name pavdental-db-subnets \
       --vpc-security-group-ids sg-pavdental-db
     ```

3. **Verify Database Integrity**:
   - Connect to the recovered instance and verify audit log hash chains:
     ```bash
     DATABASE_URL="postgresql://...pavdental-recovery-pg..." npx tsx scripts/verify-audit-chain.ts
     ```

4. **Promote / Repoint Application**:
   - Update `DATABASE_URL` in application secret configuration (AWS Secrets Manager / ECS task definition) to point to the restored cluster.
   - Run release command:
     ```bash
     npx prisma migrate deploy
     ```

---

## 3. Object Storage (S3) Protection

- **Bucket Versioning**: Enabled on all clinical document and photo buckets (`pavdental-clinical-documents-*`).
- **Object Lock / MFA Delete**: Compliance-retention documents are protected against premature deletion.
- **Server-Side Encryption**: SSE-KMS enforced at bucket policy level (`aws:kms`).
- **Cross-Region Replication (CRR)**: Critical patient consent bundles and audit archives replicate from `eu-west-2` (London) to `eu-west-1` (Ireland).

---

## 4. Quarterly Disaster Recovery Drill

Every 90 days, operations executes a staged recovery drill in the staging environment:
1. Spin up an empty RDS instance.
2. Restore from the most recent daily backup snapshot.
3. Apply outstanding migrations (`npx prisma migrate deploy`).
4. Execute audit chain verification test suite (`npx jest src/__tests__/audit-retention-and-tampering.test.ts`).
5. Document drill outcome, measured RTO (Recovery Time Objective), and sign-off in audit logs.
