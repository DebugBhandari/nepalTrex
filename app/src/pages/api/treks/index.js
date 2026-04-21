import { query } from '../../../lib/db';
import { minDistanceToRouteKm, parseRouteWaypoints, slugifyTrekName } from '../../../lib/treks';

const NEARBY_STAY_THRESHOLD_KM = 35;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const trekRows = await query(
      `
        SELECT name, duration_days, level, region, description, route_geojson, is_featured, elevation_min_m, elevation_max_m
        FROM treks
        ORDER BY name ASC
      `
    );

    const wishlistCountRows = await query(
      `
        SELECT trek_slug, COUNT(*)::int AS wishlist_count
        FROM user_trek_wishlists
        GROUP BY trek_slug
      `
    );

    const wishlistCountBySlug = wishlistCountRows.rows.reduce((acc, row) => {
      acc[row.trek_slug] = Number(row.wishlist_count || 0);
      return acc;
    }, {});

    const stayRows = await query(
      `
        SELECT latitude, longitude
        FROM stays
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      `
    );

    const stayCoordinates = stayRows.rows
      .map((stay) => ({
        lat: Number(stay.latitude),
        lng: Number(stay.longitude),
      }))
      .filter((stay) => Number.isFinite(stay.lat) && Number.isFinite(stay.lng));

    const treks = trekRows.rows.map((row) => ({
      routeWaypoints: parseRouteWaypoints(row.route_geojson),
      name: row.name,
      slug: slugifyTrekName(row.name),
      durationDays: row.duration_days,
      level: row.level,
      region: row.region,
      description: row.description || '',
      routeGeojson: row.route_geojson,
      isFeatured: row.is_featured,
      elevationMinM: row.elevation_min_m || null,
      elevationMaxM: row.elevation_max_m || null,
    })).map((trek) => {
      const nearbyStaysCount = stayCoordinates.filter((stay) => {
        const distanceKm = minDistanceToRouteKm(trek.routeWaypoints, stay.lat, stay.lng);
        return Number.isFinite(distanceKm) && distanceKm <= NEARBY_STAY_THRESHOLD_KM;
      }).length;

      return {
        name: trek.name,
        slug: trek.slug,
        durationDays: trek.durationDays,
        level: trek.level,
        region: trek.region,
        description: trek.description,
        routeGeojson: trek.routeGeojson,
        isFeatured: trek.isFeatured,
        elevationMinM: trek.elevationMinM,
        elevationMaxM: trek.elevationMaxM,
        nearbyStaysCount,
        wishlistCount: Number(wishlistCountBySlug[trek.slug] || 0),
      };
    });

    return res.status(200).json({ treks });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch treks' });
  }
}
