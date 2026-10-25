-- =============================================================================
-- 002_drop_patients_table.sql — Drop redundant dashboard patients table
-- Per AGENTS.md: Patient records belong exclusively to the backend database.
-- =============================================================================

DROP TABLE IF EXISTS patients;
