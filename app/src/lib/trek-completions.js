import crypto from 'crypto';
import { haversineKm, parseRouteWaypoints } from './treks';

export const COMPLETION_RADIUS_KM = 10;
export const MAX_LOCATION_ACCURACY_M = 5_000;

export function evaluateTrekCompletion(routeGeojson, locationRows) {
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

  const matchedWaypoints = waypoints.map((waypoint) => {
    const closestDistanceKm = usableRecords.reduce((closest, record) => Math.min(
      closest,
      haversineKm(waypoint.lat, waypoint.lng, Number(record.latitude), Number(record.longitude))
    ), Number.POSITIVE_INFINITY);
    return {
      place: waypoint.place || 'Route waypoint',
      verified: closestDistanceKm <= COMPLETION_RADIUS_KM,
      closestDistanceKm: Number.isFinite(closestDistanceKm) ? closestDistanceKm : null,
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