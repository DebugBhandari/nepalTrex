import crypto from 'crypto';
import { haversineKm, parseRouteWaypoints } from './treks';

export const WAYPOINT_COMPLETION_RADIUS_M = 250;
export const MAX_LOCATION_ACCURACY_M = 100;

export function evaluateTrekCompletion(routeGeojson, locationRows, completedWaypoints = []) {
  const waypoints = parseRouteWaypoints(routeGeojson);
  const usableRecords = (locationRows || []).filter((record) => {
    const latitude = Number(record.latitude);
    const longitude = Number(record.longitude);
    const accuracy = record.accuracy_m === null || record.accuracy_m === undefined
      ? 0
      : Number(record.accuracy_m);
    return Number.isFinite(latitude) && Number.isFinite(longitude) &&
      Number.isFinite(accuracy) && accuracy <= MAX_LOCATION_ACCURACY_M;
  });

  const completedByIndex = new Map(completedWaypoints.map((waypoint) => [Number(waypoint.waypoint_index), waypoint]));
  const matchedWaypoints = waypoints.map((waypoint, waypointIndex) => {
    const completed = completedByIndex.get(waypointIndex);
    const closestDistanceKm = usableRecords.reduce((closest, record) => Math.min(
      closest,
      haversineKm(waypoint.lat, waypoint.lng, Number(record.latitude), Number(record.longitude))
    ), Number.POSITIVE_INFINITY);
    return {
      index: waypointIndex,
      place: waypoint.place || `Coordinate ${waypointIndex + 1}`,
      latitude: waypoint.lat,
      longitude: waypoint.lng,
      verified: Boolean(completed),
      closestDistanceKm: Number.isFinite(closestDistanceKm) ? closestDistanceKm : null,
      completedAt: completed?.completed_at || null,
      distanceM: completed?.distance_m === undefined ? null : Number(completed.distance_m),
      isDemo: Boolean(completed?.is_demo),
    };
  });

  const verifiedWaypointCount = matchedWaypoints.filter((waypoint) => waypoint.verified).length;
  return {
    eligible: waypoints.length > 0 && verifiedWaypointCount === waypoints.length,
    waypointCount: waypoints.length,
    verifiedWaypointCount,
    locationRecordCount: usableRecords.length,
    matchedWaypoints,
  };
}

export function createCertificateCode() {
  return `NTX-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}