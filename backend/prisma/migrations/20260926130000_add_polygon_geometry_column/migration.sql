-- Add the derived geometry column + spatial index for van service polygons.
-- The original 20260921030000_add_postgis_geometry migration added these
-- conditionally (DO block) and its condition silently skipped when the table
-- did not yet exist, so this makes the DDL unconditional and idempotent.

ALTER TABLE "van_service_polygons" ADD COLUMN IF NOT EXISTS "polygon" geometry(Polygon,4326);

CREATE INDEX IF NOT EXISTS "idx_van_service_polygons_polygon"
ON "van_service_polygons" USING GIST ("polygon");
