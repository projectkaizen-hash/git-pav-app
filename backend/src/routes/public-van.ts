import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";
import { vanCoverageCheckSchema } from "../schemas/van";
import { pointInPolygon, calculateDistance, getPolygonCentroid, Point, Polygon } from "../lib/geo";

const router = Router();

// ─── POST /api/public/van/coverage-check ───────────────────────────────────────
// Public endpoint - no auth required for coverage checking
// Accepts either GPS coordinates (lat/lng) or postcode
router.post("/coverage-check", validateBody(vanCoverageCheckSchema), async (req: Request, res: Response) => {
  const { lat, lng, postcode } = req.body;

  let checkPoint: Point | null = null;
  let inputType: string;
  let processedPostcode: string | null = null;

  // Determine input type and get coordinates
  if (lat !== undefined && lng !== undefined) {
    // GPS coordinates provided (preferred)
    checkPoint = { lat, lng };
    inputType = "gps";
  } else if (postcode) {
    // Postcode provided (fallback)
    const clean = String(postcode).toUpperCase().replace(/\s/g, "");
    processedPostcode = clean;
    inputType = "postcode";
    
    // Convert postcode to approximate coordinates using centroid of matching area
    checkPoint = await postcodeToCoordinates(clean);
    
    if (!checkPoint) {
      return res.json({
        postcode: clean,
        isCovered: false,
        assignedVan: null,
        vehicleType: null,
        activeSector: null,
        message: "This postcode is outside our current service area. Please try a London postcode or use GPS location.",
        inputType: "postcode"
      });
    }
  } else {
    return res.status(400).json({
      error: "Either lat/lng coordinates or postcode must be provided"
    });
  }

  // Fetch all active van polygons from DB
  const polygons = await prisma.vanServicePolygon.findMany({
    include: { van: { select: { name: true, registrationPlate: true, vehicleModel: true } } },
  });

  // Check coverage using spatial point-in-polygon
  const coverageResults = polygons
    .map(polygon => {
      const geoJson = polygon.polygonGeoJson as unknown as Polygon;
      const isCovered = checkPoint && pointInPolygon(checkPoint, geoJson);
      
      if (isCovered && checkPoint) {
        const centroid = getPolygonCentroid(geoJson);
        const distance = calculateDistance(checkPoint, centroid);
        
        return {
          polygon,
          isCovered: true,
          distance
        };
      }
      
      return { polygon, isCovered: false, distance: null };
    })
    .filter(result => result.isCovered)
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  const bestMatch = coverageResults[0] || null;

  return res.json({
    postcode: processedPostcode,
    coordinates: checkPoint,
    isCovered: !!bestMatch,
    assignedVan: bestMatch?.polygon.van.name ?? null,
    vehicleType: bestMatch?.polygon.van.vehicleModel ?? null,
    activeSector: bestMatch?.polygon.sectorName ?? null,
    distanceKm: bestMatch?.distance ?? null,
    message: bestMatch 
      ? `Your location is within our mobile van service area (${bestMatch.distance?.toFixed(1)} km from service center)` 
      : "Your location is currently outside our mobile van service area. Please try our clinic services instead.",
    inputType
  });
});

/**
 * Convert UK postcode to approximate coordinates
 * This is a simplified implementation - in production, use a proper geocoding service
 */
async function postcodeToCoordinates(postcode: string): Promise<Point | null> {
  // Simple postcode prefix to coordinate mapping for London areas
  // In production, replace with proper geocoding service (Google Maps, Nominatim, etc.)
  
  // Extract the prefix (first 1-2 letters before the number)
  const match = postcode.match(/^([A-Z]{1,2})/i);
  const postcodePrefix = match ? match[1].toUpperCase() : "";
  
  // London area centroids (approximate)
  const londonCentroids: Record<string, Point> = {
    "SW": { lat: 51.49, lng: -0.18 },  // South West London
    "W":  { lat: 51.51, lng: -0.19 },  // West London
    "EC": { lat: 51.51, lng: -0.09 },  // East Central London
    "WC": { lat: 51.51, lng: -0.13 },  // West Central London
    "SE": { lat: 51.48, lng: -0.05 },  // South East London
    "NW": { lat: 51.55, lng: -0.18 },  // North West London
    "E":  { lat: 51.52, lng: -0.03 },  // East London
  };
  
  const centroid = londonCentroids[postcodePrefix];
  
  if (centroid) {
    // Add some randomness to simulate different postcodes within the same area
    const offset = 0.01;
    return {
      lat: centroid.lat + (Math.random() - 0.5) * offset,
      lng: centroid.lng + (Math.random() - 0.5) * offset
    };
  }
  
  // For non-London postcodes, return a point that will definitely be outside coverage
  // Aberdeen coordinates (definitely outside London service area)
  return { lat: 57.1497, lng: -2.0943 };
}

export default router;