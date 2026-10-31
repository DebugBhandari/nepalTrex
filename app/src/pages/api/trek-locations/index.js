import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';
import { MAX_LOCATION_ACCURACY_M, WAYPOINT_COMPLETION_RADIUS_M } from '../../../lib/trek-completions';
import { haversineKm, parseRouteWaypoints } from '../../../lib/treks';

function coordinate(value, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });
  const { trekId, latitude: rawLatitude, longitude: rawLongitude, accuracyM: rawAccuracy } = req.body || {};
  const latitude = coordinate(rawLatitude, -90, 90);
  const longitude = coordinate(rawLongitude, -180, 180);
  const accuracy = coordinate(rawAccuracy, 0, 1_000_000);
  if (!trekId || typeof trekId !== 'string' || latitude === null || longitude === null) {
    return res.status(400).json({ error: 'A trek and valid GPS coordinates are required' });
  }
  try {
    const result = await query(
      `INSERT INTO trek_location_records (trek_id, user_id, latitude, longitude, accuracy_m)
       SELECT id, $2, $3, $4, $5 FROM treks WHERE id = $1
       RETURNING id, recorded_at`,
      [trekId, session.user.id, latitude, longitude, accuracy]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Trek not found' });
    const route = await query('SELECT route_geojson FROM treks WHERE id = $1', [trekId]);
    const waypoints = parseRouteWaypoints(route.rows[0]?.route_geojson);
    const newlyCompleted = [];
    if (accuracy !== null && accuracy <= MAX_LOCATION_ACCURACY_M) {
      const existing = await query(
        'SELECT waypoint_index FROM trek_waypoint_completions WHERE trek_id = $1 AND user_id = $2',
        [trekId, session.user.id]
      );
      const existingIndexes = new Set(existing.rows.map((row) => Number(row.waypoint_index)));
      for (const [waypointIndex, waypoint] of waypoints.entries()) {
        if (existingIndexes.has(waypointIndex)) continue;
        const distanceM = haversineKm(latitude, longitude, waypoint.lat, waypoint.lng) * 1000;
        if (distanceM > WAYPOINT_COMPLETION_RADIUS_M) continue;
        await query(
          `INSERT INTO trek_waypoint_completions
            (trek_id, user_id, waypoint_index, waypoint_name, waypoint_latitude, waypoint_longitude, recorded_latitude, recorded_longitude, accuracy_m, distance_m, location_record_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (user_id, trek_id, waypoint_index) DO NOTHING`,
          [trekId, session.user.id, waypointIndex, waypoint.place || `Coordinate ${waypointIndex + 1}`, waypoint.lat, waypoint.lng, latitude, longitude, accuracy, distanceM, result.rows[0].id]
        );
        newlyCompleted.push(waypointIndex);
      }
    }
    return res.status(201).json({ record: result.rows[0], newlyCompleted });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to record GPS evidence' });
  }
}