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
        SELECT
          t.name,
          t.duration_days,
          t.level,
          t.region,
          t.description,
          t.route_geojson,
          t.is_featured,
          t.elevation_min_m,
          t.elevation_max_m,
          t.avg_rating,
          t.review_count,
          (
            SELECT COUNT(DISTINCT gp.id)::int
            FROM guide_profiles gp
            WHERE gp.approval_status = 'approved'
              AND (
                lower(trim(gp.home_region)) = lower(trim(t.region))
                OR EXISTS (
                  SELECT 1
                  FROM guide_packages guide_package
                  WHERE guide_package.guide_profile_id = gp.id
                    AND guide_package.is_active = true
                    AND lower(trim(guide_package.region)) = lower(trim(t.region))
                )
              )
          ) AS available_guide_count
        FROM treks t
        ORDER BY t.name ASC
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
      avgRating: row.avg_rating === null ? null : Number(row.avg_rating),
      reviewCount: Number(row.review_count || 0),
      availableGuideCount: Number(row.available_guide_count || 0),
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
        avgRating: trek.avgRating,
        reviewCount: trek.reviewCount,
        availableGuideCount: trek.availableGuideCount,
        nearbyStaysCount,
        wishlistCount: Number(wishlistCountBySlug[trek.slug] || 0),
      };
    });

    return res.status(200).json({ treks });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to fetch treks' });
  }
}
