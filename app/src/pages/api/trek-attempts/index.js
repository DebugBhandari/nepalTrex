import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';

function serializeAttempt(row) {
  return {
    id: row.id,
    trekId: row.trek_id,
    trekName: row.trek_name,
    trekSlug: row.trek_slug,
    attemptedAt: row.attempted_at,
    startLatitude:
      row.start_latitude === null ? null : Number(row.start_latitude),
    startLongitude:
      row.start_longitude === null ? null : Number(row.start_longitude),
    startAccuracyM:
      row.start_accuracy_m === null ? null : Number(row.start_accuracy_m),
  };
}

function coordinate(value, minimum, maximum) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id)
    return res.status(401).json({ error: 'Authentication required' });

  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT a.*, t.name AS trek_name,
          trim(both '-' from regexp_replace(lower(t.name), '[^a-z0-9]+', '-', 'g')) AS trek_slug
         FROM trek_attempts a
         JOIN treks t ON t.id = a.trek_id
         WHERE a.user_id = $1
         ORDER BY a.attempted_at DESC
         LIMIT 50`,
        [session.user.id]
      );
      return res
        .status(200)
        .json({ attempts: result.rows.map(serializeAttempt) });
    } catch (error) {
      return res
        .status(500)
        .json({ error: error.message || 'Unable to load trek attempts' });
    }
  }

  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { trekId, startLatitude, startLongitude, startAccuracyM } =
    req.body || {};
  if (!trekId || typeof trekId !== 'string')
    return res.status(400).json({ error: 'A valid trek is required' });

  const latitude = coordinate(startLatitude, -90, 90);
  const longitude = coordinate(startLongitude, -180, 180);
  const accuracy = coordinate(startAccuracyM, 0, 1_000_000);
  if (latitude === null || longitude === null)
    return res
      .status(400)
      .json({ error: 'Your current location is required to begin an attempt' });

  try {
    const result = await query(
      `INSERT INTO trek_attempts (trek_id, user_id, start_latitude, start_longitude, start_accuracy_m)
       SELECT id, $2, $3, $4, $5 FROM treks WHERE id = $1
       RETURNING id, trek_id, user_id, start_latitude, start_longitude, start_accuracy_m, attempted_at`,
      [trekId, session.user.id, latitude, longitude, accuracy]
    );
    if (!result.rows[0])
      return res.status(404).json({ error: 'Trek not found' });
    return res
      .status(201)
      .json({
        attempt: serializeAttempt({
          ...result.rows[0],
          trek_name: '',
          trek_slug: '',
        }),
      });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error.message || 'Unable to start trek attempt' });
  }
}
