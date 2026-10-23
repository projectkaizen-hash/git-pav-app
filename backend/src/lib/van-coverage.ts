// backend/src/lib/van-coverage.ts
// Unified van coverage checking.
//
// Single source of truth for "which vans cover this point", replacing the
// duplicated ray-casting implementations that previously lived in
// routes/van.ts, routes/public-van.ts and (in variant form) lib/geo.ts.
//
// Strategy: PostGIS-first, JS fallback.
// - PostGIS path uses the indexed geometry column (GIST index, ST_Contains,
//   spheroid-accurate ST_Distance) — ideal in production where docker-compose
//   ships the postgis/postgis image.
// - JS path uses ray-casting on the stored GeoJSON. This is not just a dev
//   convenience: local databases may genuinely lack the extension, so every
//   consumer must work identically either way.
//
// Self-healing:
// - On startup with PostGIS present, polygons whose derived geometry is NULL
//   (inserted before the geometry trigger existed) are backfilled from their
//   GeoJSON, and the geometry-sync trigger is (re)created with corrected SRID
//   handling (ST_SetSRID — the original migration version omitted it, leaving
//   SRID-0 geometry that ST_Contains can never match).
// - On startup without PostGIS, the derived-geometry trigger is dropped: its
//   only job is maintaining the geometry column, and with the extension
//   missing it would make every polygon INSERT fail. GeoJSON stays the
//   authoritative source of truth in that mode.

import { prisma } from "./prisma";
import {
  Point,
  Polygon,
  pointInPolygon as geoPointInPolygon,
  calculateDistance,
  getPolygonCentroid,
} from "./geo";

export type CoverageBackendMode = "postgis" | "js";

export type CoverageBackend = {
  mode: CoverageBackendMode;
  /** Why the JS fallback is active (absent when PostGIS is in use) */
  reason?: string;
};

let backendCache: CoverageBackend | null = null;
let ensurePromise: Promise<CoverageBackend> | null = null;

/**
 * Probe (once per process) which coverage backend is usable.
 * - Verifies the postgis extension AND the geometry column exist.
 * - Backfills NULL geometry columns from GeoJSON when PostGIS is available.
 * - Drops the derived-geometry trigger when PostGIS is absent (see file docs).
 *
 * Pass force=true to re-probe (e.g. after installing the extension).
 */
export async function getCoverageBackend(force = false): Promise<CoverageBackend> {
  if (backendCache && !force) return backendCache;
  if (ensurePromise && !force) return ensurePromise;

  ensurePromise = (async (): Promise<CoverageBackend> => {
    try {
      const extRows = await prisma.$queryRaw<{ extname: string }[]>`
        SELECT extname FROM pg_extension WHERE extname = 'postgis'`;
      if (extRows.length === 0) throw new Error("postgis extension not installed");

      const colRows = await prisma.$queryRaw<{ cnt: bigint }[]>`
        SELECT count(*)::int AS cnt
        FROM information_schema.columns
        WHERE table_name = 'van_service_polygons' AND column_name = 'polygon'`;
      if (Number(colRows[0]?.cnt ?? 0) === 0) throw new Error("geometry column missing");

      // Heal legacy rows inserted before the geometry trigger existed.
      await backfillPolygonGeometry();

      // (Re)install the geometry-sync trigger. The version from the original
      // migration produced SRID-0 geometry (missing ST_SetSRID), which
      // ST_Contains can never match — recreate it corrected.
      await installGeometryTrigger();

      backendCache = { mode: "postgis" };
      console.log("[VAN COVERAGE] Using PostGIS spatial queries (indexed geometry column)");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      backendCache = { mode: "js", reason };
      console.warn(`[VAN COVERAGE] PostGIS unavailable (${reason}) — using JS ray-casting fallback`);

      // The geometry-sync trigger references PostGIS functions; with the
      // extension missing it turns every polygon write into an error.
      // GeoJSON is the source of truth, so remove the dead trigger.
      await prisma
        .$executeRawUnsafe(`DROP TRIGGER IF EXISTS trigger_update_polygon ON van_service_polygons`)
        .catch((e) => console.warn("[VAN COVERAGE] Could not drop geometry trigger:", e));
    }
    return backendCache!;
  })();

  try {
    return await ensurePromise;
  } finally {
    if (backendCache) ensurePromise = null;
  }
}

/** Copy GeoJSON into the geometry column for rows where it is NULL. */
async function backfillPolygonGeometry(): Promise<void> {
  const result = await prisma.$executeRawUnsafe(`
    UPDATE van_service_polygons
    SET polygon = ST_SetSRID(ST_GeomFromGeoJSON(polygon_geojson::text), 4326)
    WHERE polygon IS NULL AND polygon_geojson IS NOT NULL
  `);
  if (result > 0) {
    console.log(`[VAN COVERAGE] Backfilled geometry for ${result} polygon(s) from GeoJSON`);
  }
}

/**
 * Keep the geometry column in sync with the authoritative GeoJSON on writes.
 * Recreated with ST_SetSRID(…, 4326) — the migration's original version left
 * the SRID unset, silently breaking ST_Contains for any newly written row.
 */
async function installGeometryTrigger(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION update_polygon_from_geojson() RETURNS trigger AS $$
    BEGIN
      IF NEW.polygon_geojson IS NOT NULL THEN
        NEW.polygon := ST_SetSRID(ST_GeomFromGeoJSON(NEW.polygon_geojson::text), 4326);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS trigger_update_polygon ON van_service_polygons
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trigger_update_polygon
    BEFORE INSERT OR UPDATE OF polygon_geojson ON van_service_polygons
    FOR EACH ROW EXECUTE FUNCTION update_polygon_from_geojson()
  `);
}

export type VanCoverageMatch = {
  vanId: string;
  vanName: string;
  vehicleModel: string;
  sectorName: string;
  /** Distance from the point to the polygon centroid (km) */
  distanceKm: number;
};

/**
 * Find every active van whose service polygon contains the given point,
 * ordered nearest-centroid first. Works on both backends with identical
 * return shape.
 */
export async function findCoveringVans(point: Point): Promise<VanCoverageMatch[]> {
  const backend = await getCoverageBackend();

  if (backend.mode === "postgis") {
    try {
      return await findCoveringVansPostgis(point);
    } catch (err) {
      console.warn("[VAN COVERAGE] PostGIS query failed — falling back to JS:", err);
      backendCache = { mode: "js", reason: "postgis query failed" };
    }
  }
  return findCoveringVansJs(point);
}

async function findCoveringVansPostgis(point: Point): Promise<VanCoverageMatch[]> {
  const rows = await prisma.$queryRaw<{
    van_id: string;
    van_name: string;
    vehicle_model: string;
    sector_name: string;
    distance_km: number;
  }[]>`
    SELECT
      v.id AS van_id,
      v.name AS van_name,
      v.vehicle_model,
      vsp.sector_name,
      ST_Distance(
        vsp.polygon::geography,
        ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography
      ) / 1000.0 AS distance_km
    FROM van_service_polygons vsp
    JOIN vans v ON v.id = vsp.van_id
    WHERE v.is_active = true
      AND ST_Contains(vsp.polygon, ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326))
    ORDER BY distance_km ASC`;

  return rows.map((r) => ({
    vanId: r.van_id,
    vanName: r.van_name,
    vehicleModel: r.vehicle_model,
    sectorName: r.sector_name,
    distanceKm: Number(r.distance_km),
  }));
}

async function findCoveringVansJs(point: Point): Promise<VanCoverageMatch[]> {
  const polygons = await prisma.vanServicePolygon.findMany({
    where: { van: { isActive: true } },
    include: { van: { select: { name: true, vehicleModel: true } } },
  });

  const matches: VanCoverageMatch[] = [];
  for (const p of polygons) {
    const polygon = toPolygon(p.polygonGeoJson);
    if (!polygon) continue;
    if (!geoPointInPolygon(point, polygon)) continue;

    matches.push({
      vanId: p.vanId,
      vanName: p.van.name,
      vehicleModel: p.van.vehicleModel,
      sectorName: p.sectorName,
      distanceKm: calculateDistance(point, getPolygonCentroid(polygon)),
    });
  }

  return matches.sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * All currently-online shifts whose van covers the given point.
 * Used by the patient availability and request-creation flows.
 */
export async function getOnlineShiftsCoveringPoint(point: Point) {
  const shifts = await prisma.vanShift.findMany({
    where: { status: "online", endedAt: null },
    include: { van: { include: { servicePolygons: true } } },
  });

  const backend = await getCoverageBackend();

  if (backend.mode === "postgis") {
    try {
      const coveringVanIds = new Set((await findCoveringVansPostgis(point)).map((m) => m.vanId));
      return shifts.filter((s) => coveringVanIds.has(s.vanId));
    } catch (err) {
      console.warn("[VAN COVERAGE] PostGIS shift query failed — falling back to JS:", err);
      backendCache = { mode: "js", reason: "postgis query failed" };
    }
  }

  return shifts.filter((shift) =>
    shift.van.servicePolygons.some((p) => {
      const polygon = toPolygon(p.polygonGeoJson);
      return polygon ? geoPointInPolygon(point, polygon) : false;
    })
  );
}

/**
 * Tolerant GeoJSON normalization: accepts a full GeoJSON Polygon or a bare
 * coordinate ring (the legacy JS implementations accepted both).
 */
function toPolygon(value: unknown): Polygon | null {
  const v = value as { type?: string; coordinates?: unknown } | unknown[] | null;
  if (Array.isArray(v)) {
    // Legacy bare ring: [[[lng, lat], ...]] — wrap it in GeoJSON structure.
    if (v.length > 0 && Array.isArray(v[0]) && Array.isArray((v[0] as unknown[])[0])) {
      return { type: "Polygon", coordinates: v as Polygon["coordinates"] };
    }
    return null;
  }
  const p = v as { coordinates?: unknown } | null;
  const ring = (p?.coordinates as unknown[] | undefined)?.[0];
  if (!Array.isArray(ring) || ring.length === 0) return null;
  return { type: "Polygon", coordinates: p!.coordinates as Polygon["coordinates"] };
}
