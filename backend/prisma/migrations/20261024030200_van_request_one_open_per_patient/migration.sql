-- CS-15 (VR-6, DB-2): a patient can have only one open van request (pending,
-- accepted or in progress). See 20261024030000 for why this is partial,
-- concurrent and not in schema.prisma.
-- Rollback: DROP INDEX CONCURRENTLY "van_service_requests_one_open_per_patient".
CREATE UNIQUE INDEX CONCURRENTLY "van_service_requests_one_open_per_patient" ON "van_service_requests"("patient_id") WHERE "status" IN ('pending', 'accepted', 'in_progress');
