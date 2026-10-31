import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';
import { query } from '../../../lib/db';
import { COMPLETION_RADIUS_KM, createCertificateCode, evaluateTrekCompletion } from '../../../lib/trek-completions';

function serializeCompletion(row) {
  return {
    id: row.id,
    trekId: row.trek_id,
    trekName: row.trek_name,
    trekSlug: row.trek_slug,
    completedAt: row.completed_at,
    certificateCode: row.certificate_code,
    waypointCount: Number(row.waypoint_count),
  };
}

async function getTrekAndEvidence(trekId, userId) {
  const [trekResult, locationResult] = await Promise.all([
    query('SELECT id, name, route_geojson FROM treks WHERE id = $1 LIMIT 1', [trekId]),
    query(`SELECT latitude, longitude, accuracy_m
      FROM trek_location_records
      WHERE trek_id = $1 AND user_id = $2
      ORDER BY recorded_at ASC`, [trekId, userId]),
  ]);
  return { trek: trekResult.rows[0], records: locationResult.rows };
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Authentication required' });

  if (req.method === 'GET') {
    const trekId = typeof req.query.trekId === 'string' ? req.query.trekId : null;
    if (trekId) {
      const { trek, records } = await getTrekAndEvidence(trekId, session.user.id);
      if (!trek) return res.status(404).json({ error: 'Trek not found' });
      const verification = evaluateTrekCompletion(trek.route_geojson, records);
      const completion = await query(
        `SELECT id, trek_id, completed_at, certificate_code, waypoint_count
         FROM trek_completions WHERE trek_id = $1 AND user_id = $2 LIMIT 1`,
        [trekId, session.user.id]
      );
      return res.status(200).json({ verification, completion: completion.rows[0] || null });
    }

    const result = await query(
      `SELECT c.*, t.name AS trek_name,
        trim(both '-' from regexp_replace(lower(t.name), '[^a-z0-9]+', '-', 'g')) AS trek_slug
       FROM trek_completions c JOIN treks t ON t.id = c.trek_id
       WHERE c.user_id = $1 ORDER BY c.completed_at DESC`,
      [session.user.id]
    );
    return res.status(200).json({ completions: result.rows.map(serializeCompletion) });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const trekId = req.body?.trekId;
  if (!trekId || typeof trekId !== 'string') return res.status(400).json({ error: 'A valid trek is required' });

  try {
    const existing = await query(
      `SELECT id, trek_id, completed_at, certificate_code, waypoint_count
       FROM trek_completions WHERE trek_id = $1 AND user_id = $2 LIMIT 1`,
      [trekId, session.user.id]
    );
    if (existing.rows[0]) return res.status(200).json({ completion: existing.rows[0], alreadyCompleted: true });

    const { trek, records } = await getTrekAndEvidence(trekId, session.user.id);
    if (!trek) return res.status(404).json({ error: 'Trek not found' });
    const verification = evaluateTrekCompletion(trek.route_geojson, records);
    if (!verification.eligible) {
      return res.status(409).json({
        error: `Record GPS evidence within ${COMPLETION_RADIUS_KM} km of every mapped waypoint before claiming this certificate.`,
        verification,
      });
    }

    const inserted = await query(
      `INSERT INTO trek_completions (trek_id, user_id, verification_radius_km, waypoint_count, certificate_code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, trek_id) DO UPDATE SET trek_id = EXCLUDED.trek_id
       RETURNING id, trek_id, completed_at, certificate_code, waypoint_count`,
      [trekId, session.user.id, COMPLETION_RADIUS_KM, verification.waypointCount, createCertificateCode()]
    );
    return res.status(201).json({ completion: inserted.rows[0], verification });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Unable to verify trek completion' });
  }
}