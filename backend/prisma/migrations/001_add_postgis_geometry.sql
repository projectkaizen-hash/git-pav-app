-- Add PostGIS geometry column to van_service_polygons
-- This enables efficient spatial queries for GPS-based coverage checking

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry column for spatial queries
ALTER TABLE van_service_polygons 
ADD COLUMN IF NOT EXISTS polygon geometry(Polygon,4326);

-- Create spatial index for efficient point-in-polygon queries
CREATE INDEX IF NOT EXISTS idx_van_service_polygons_polygon 
ON van_service_polygons USING GIST (polygon);

-- Create a function to convert GeoJSON to PostGIS geometry
CREATE OR REPLACE FUNCTION update_polygon_from_geojson()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.polygon_geojson IS NOT NULL THEN
        NEW.polygon = ST_GeomFromGeoJSON(NEW.polygon_geojson::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update geometry when GeoJSON changes
DROP TRIGGER IF EXISTS trigger_update_polygon ON van_service_polygons;
CREATE TRIGGER trigger_update_polygon
BEFORE INSERT OR UPDATE OF polygon_geojson ON van_service_polygons
FOR EACH ROW EXECUTE FUNCTION update_polygon_from_geojson();

-- Function to check if a point is within any van service polygon
CREATE OR REPLACE FUNCTION check_van_coverage(lat numeric, lng numeric)
RETURNS TABLE(van_id uuid, van_name text, vehicle_model text, sector_name text, distance_km numeric) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id as van_id,
        v.name as van_name,
        v.vehicle_model,
        vsp.sector_name,
        ST_Distance(vsp.polygon, ST_SetSRID(ST_MakePoint(lng, lat), 4326)) / 1000 as distance_km
    FROM van_service_polygons vsp
    JOIN vans v ON v.id = vsp.van_id
    WHERE v.is_active = true
    AND ST_Contains(vsp.polygon, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
    ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;