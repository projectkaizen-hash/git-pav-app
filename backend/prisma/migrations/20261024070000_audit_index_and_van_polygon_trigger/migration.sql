-- CreateIndex
CREATE INDEX "audit_logs_archived_timestamp_utc_id_idx" ON "audit_logs"("archived", "timestamp_utc", "id");

-- VC-1: Install corrected GeoJSON -> PostGIS SRID-4326 trigger and backfill in migration
CREATE OR REPLACE FUNCTION update_polygon_from_geojson() RETURNS trigger AS $$
BEGIN
  IF NEW.polygon_geojson IS NOT NULL THEN
    NEW.polygon := ST_SetSRID(ST_GeomFromGeoJSON(NEW.polygon_geojson::text), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_polygon ON van_service_polygons;
CREATE TRIGGER trigger_update_polygon
BEFORE INSERT OR UPDATE OF polygon_geojson ON van_service_polygons
FOR EACH ROW EXECUTE FUNCTION update_polygon_from_geojson();

UPDATE van_service_polygons
SET polygon = ST_SetSRID(ST_GeomFromGeoJSON(polygon_geojson::text), 4326)
WHERE polygon IS NULL AND polygon_geojson IS NOT NULL;
