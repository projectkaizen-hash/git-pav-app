// backend/src/lib/van-eta.ts
// ETA computation for live van dispatch (Pav Dental)
// Uses Haversine fallback (20 km/h urban London). Swap travelSeconds() for
// a real routing API (Mapbox / OSRM) when a key is available.

export type Point = { lat: number; lng: number };

export type QueueStop = {
  lat: number;
  lng: number;
  phase: string; // VanStopPhase string values
  treatmentStartedAt: Date | null;
  treatmentMinutes: number; // service durationMinutes or 45 default
  bufferMinutes: number;    // 10 default
};

const EARTH_RADIUS_M = 6_371_000;
const URBAN_SPEED_MS = 20_000 / 3600; // 20 km/h in m/s

/** Haversine straight-line distance in metres */
function haversineMetres(a: Point, b: Point): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const sinΔφ = Math.sin(Δφ / 2);
  const sinΔλ = Math.sin(Δλ / 2);
  const x = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(x));
}

/**
 * Travel time estimate in seconds between two points.
 * Uses Haversine × urban-speed factor.
 * TODO: replace with Mapbox/OSRM when ROUTING_API_KEY is set.
 */
export async function travelSeconds(from: Point, to: Point): Promise<number> {
  const dist = haversineMetres(from, to);
  // Apply 1.4× road-factor for urban routing (straight-line is shorter than roads)
  return Math.round((dist * 1.4) / URBAN_SPEED_MS);
}

/**
 * How many seconds of treatment remain for this stop.
 * - queued / en_route / on_site → full block
 * - in_treatment → elapsed time subtracted
 * - completed / cancelled → 0
 */
export function remainingTreatmentSeconds(stop: QueueStop, now = new Date()): number {
  const full = stop.treatmentMinutes * 60;
  if (stop.phase === "in_treatment" && stop.treatmentStartedAt) {
    const elapsed = (now.getTime() - stop.treatmentStartedAt.getTime()) / 1000;
    return Math.max(0, full - elapsed);
  }
  if (stop.phase === "completed" || stop.phase === "cancelled") return 0;
  return full;
}

/**
 * Compute ETA in seconds from van's current position to a new patient at `target`.
 * Queue is ordered accepted+in_progress stops only.
 *
 * ETA chain formula (per spec):
 *   For each stop before target: travel_to_stop + remaining_treatment + buffer
 *   Then: travel from last stop (or van) to target
 */
export async function etaSecondsToNewPatient(
  van: Point,
  queue: QueueStop[],
  target: Point,
): Promise<number> {
  let t = 0;
  let cursor: Point = van;

  for (const stop of queue) {
    // Skip travel if already on_site or in_treatment (van is already there)
    if (stop.phase !== "on_site" && stop.phase !== "in_treatment") {
      t += await travelSeconds(cursor, { lat: stop.lat, lng: stop.lng });
    }
    t += remainingTreatmentSeconds(stop);
    t += stop.bufferMinutes * 60;
    cursor = { lat: stop.lat, lng: stop.lng };
  }

  t += await travelSeconds(cursor, target);
  return Math.round(t);
}

/**
 * Format ETA seconds into a patient-friendly band string.
 * e.g. 1500s → "20–30 min", 90s → "< 5 min", 7200s → "~2 hr"
 */
export function formatEtaLabel(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 5) return "< 5 min";
  if (minutes <= 60) {
    // Round to nearest 5, give a ±5 min band
    const lo = Math.max(5, Math.floor(minutes / 5) * 5);
    const hi = lo + 10;
    return `${lo}–${hi} min`;
  }
  const hours = (seconds / 3600).toFixed(1);
  return `~${hours} hr`;
}

/** Max accepted queue depth (patients) */
export const MAX_QUEUE_DEPTH = parseInt(process.env.VAN_MAX_QUEUE_DEPTH ?? "5", 10);

/** Request timeout in milliseconds */
export const REQUEST_TIMEOUT_MS =
  parseInt(process.env.VAN_REQUEST_TIMEOUT_MINUTES ?? "4", 10) * 60 * 1000;

/** Max ETA in seconds to show to new patients (beyond this: "Queue full / try later") */
export const MAX_ETA_SECONDS = 4 * 60 * 60; // 4 hours

