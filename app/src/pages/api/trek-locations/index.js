import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

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
    return res.status(201).json({ record: result.rows[0] });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to record GPS evidence' });
  }
}