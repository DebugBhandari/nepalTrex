import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth-options';
import { query } from '../../../../lib/db';

const ALLOWED_LEVELS = new Set([
  'easy',
  'moderate',
  'challenging',
  'easy to moderate',
  'moderate to challenging',
  'very challenging',
]);

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (session.user.role !== 'superUser') {
    return res.status(403).json({ error: 'Only superUsers can update trek details' });
  }

  const trekId = req.query.id;
  const { name, durationDays, level, region, description, isFeatured, routeGeojson, elevationMinM, elevationMaxM } = req.body || {};

  if (!trekId) {
    return res.status(400).json({ error: 'Missing trek id' });
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const parsedDuration = Number(durationDays);
  if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
    return res.status(400).json({ error: 'Duration must be a positive integer' });
  }

  if (!level || !ALLOWED_LEVELS.has((level || '').toLowerCase())) {
    return res.status(400).json({ error: 'Invalid difficulty level' });
  }

  if (!region || typeof region !== 'string' || !region.trim()) {
    return res.status(400).json({ error: 'Region is required' });
  }

  if (typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a string' });
  }

  if (typeof isFeatured !== 'boolean') {
    return res.status(400).json({ error: 'isFeatured must be true or false' });
  }

  // routeGeojson is optional — null clears it, an object/array stores it
  let parsedRouteGeojson = null;
  if (routeGeojson !== undefined && routeGeojson !== null) {
    if (typeof routeGeojson !== 'object') {
      return res.status(400).json({ error: 'routeGeojson must be an object or null' });
    }
    parsedRouteGeojson = routeGeojson;
  }

  const parsedElevationMin = elevationMinM !== undefined && elevationMinM !== null ? Number(elevationMinM) : null;
  const parsedElevationMax = elevationMaxM !== undefined && elevationMaxM !== null ? Number(elevationMaxM) : null;

  try {
    const result = await query(
      `
        UPDATE treks
        SET
          name = $1,
          duration_days = $2,
          level = $3,
          region = $4,
          description = $5,
          is_featured = $6,
          route_geojson = $7,
          elevation_min_m = $8,
          elevation_max_m = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING id, name, duration_days, level, region, description, is_featured, route_geojson, elevation_min_m, elevation_max_m
      `,
      [
        name.trim(),
        parsedDuration,
        level,
        region.trim(),
        description.trim(),
        isFeatured,
        parsedRouteGeojson,
        parsedElevationMin,
        parsedElevationMax,
        trekId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trek not found' });
    }

    return res.status(200).json({
      message: 'Trek updated successfully',
      trek: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'A trek with this name already exists' });
    }

    return res.status(500).json({ error: error.message || 'Failed to update trek' });
  }
}
