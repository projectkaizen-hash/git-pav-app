/**
 * Geospatial utilities for van coverage checking
 * Using Turf.js-like logic for point-in-polygon checks
 */

export interface Point {
  lat: number;
  lng: number;
}

/**
 * Convert UK postcode to coordinates using postcodes.io API
 * Real geocoding service for accurate UK postcode coordinates
 *
 * Hard 3s timeout: this is called in the create-request hot path, and a slow
 * upstream must not stall dispatch (on timeout/HTTP error the postcode
 * consistency check is skipped rather than blocking the request).
 */
const POSTCODE_GEOCODE_TIMEOUT_MS = 3_000;

export async function postcodeToCoordinates(postcode: string): Promise<Point | null> {
  try {
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`,
      { signal: AbortSignal.timeout(POSTCODE_GEOCODE_TIMEOUT_MS) }
    );
    const data = await response.json() as { status: number; result?: { latitude: number; longitude: number } };
    
    if (data.status === 200 && data.result) {
      return {
        lat: data.result.latitude,
        lng: data.result.longitude
      };
    }
    
    return null;
  } catch (error) {
    console.error('Postcode geocoding error:', error);
    return null;
  }
}

export interface Polygon {
  type: "Polygon";
  coordinates: number[][][]; // GeoJSON format: [[[lng, lat], ...]]
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * This is a simplified version of Turf.js pointInPolygon
 */
export function pointInPolygon(point: Point, polygon: Polygon): boolean {
  const [x, y] = [point.lng, point.lat];
  const coords = polygon.coordinates[0]; // First ring of the polygon
  
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i];
    const [xj, yj] = coords[j];
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(point1: Point, point2: Point): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function haversineMetres(point1: Point, point2: Point): number {
  const R = 6_371_000; // Earth's radius in meters
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find the centroid of a polygon (for distance calculations)
 */
export function getPolygonCentroid(polygon: Polygon): Point {
  const coords = polygon.coordinates[0];
  let sumX = 0, sumY = 0;
  
  for (const [x, y] of coords) {
    sumX += x;
    sumY += y;
  }
  
  return {
    lng: sumX / coords.length,
    lat: sumY / coords.length
  };
}