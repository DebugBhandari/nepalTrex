export const TREK_IMAGE_BY_NAME = {
  'everest base camp trek': '/treks/everest-base-camp.jpg',
  'gokyo lakes trek': '/treks/gokyo-lakes.jpg',
  'three passes trek': '/treks/three-passes.jpg',
  'island peak trek': '/treks/island-peak.jpg',
  'annapurna circuit trek': '/treks/annapurna-circuit.jpg',
  'annapurna base camp trek': '/treks/annapurna-base-camp.jpg',
  'poon hill trek': '/treks/poon-hill.jpg',
  'mardi himal trek': '/treks/mardi-himal.jpg',
  'langtang valley trek': '/treks/langtang-valley.jpg',
  'gosaikunda trek': '/treks/gosaikunda-lake.jpg',
  'gosaikunda lake trek': '/treks/gosaikunda-lake.jpg',
  'helambu trek': '/treks/helambu.jpg',
  'manaslu circuit trek': '/treks/manaslu-circuit.jpg',
  'tsum valley trek': '/treks/tsum-valley.jpg',
  'upper mustang trek': '/treks/upper-mustang.jpg',
  'kanchenjunga north base camp trek': '/treks/kanchenjunga.jpg',
  'rara lake trek': '/treks/rara-lake.jpg',
  'everest base camp': '/treks/everest-base-camp.jpg',
  'gokyo lakes': '/treks/gokyo-lakes.jpg',
  'three passes': '/treks/three-passes.jpg',
  'annapurna circuit': '/treks/annapurna-circuit.jpg',
  'annapurna base camp': '/treks/annapurna-base-camp.jpg',
  'poon hill': '/treks/poon-hill.jpg',
  'mardi himal': '/treks/mardi-himal.jpg',
  'langtang valley': '/treks/langtang-valley.jpg',
  'gosaikunda': '/treks/gosaikunda-lake.jpg',
  'gosaikunda lake': '/treks/gosaikunda-lake.jpg',
  'helambu': '/treks/helambu.jpg',
  'manaslu circuit': '/treks/manaslu-circuit.jpg',
  'tsum valley': '/treks/tsum-valley.jpg',
  'upper mustang': '/treks/upper-mustang.jpg',
  'kanchenjunga north base camp': '/treks/kanchenjunga.jpg',
  'rara lake': '/treks/rara-lake.jpg',
};

function minioImageUrlFor(pathname) {
  const cleanPath = (pathname || '').toString().trim();
  if (!cleanPath.startsWith('/')) {
    return cleanPath;
  }

  const baseUrl = (process.env.NEXT_PUBLIC_MINIO_PUBLIC_URL || '').toString().trim().replace(/\/+$/, '');
  if (!baseUrl) {
    return 'https://placehold.co/1200x760?text=NepalTrex+Trek';
  }

  const bucket = (process.env.NEXT_PUBLIC_MINIO_BUCKET || 'nepaltrex').toString().trim();
  const safePath = cleanPath
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `${baseUrl}/${bucket}/${safePath}`;
}

export function slugifyTrekName(name = '') {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getTrekImage(name = '') {
  const imagePath = TREK_IMAGE_BY_NAME[name.toLowerCase()] || '/treks/everest-base-camp.jpg';
  return minioImageUrlFor(imagePath);
}

export function parseRouteWaypoints(routeGeojson) {
  if (!routeGeojson) return [];

  let parsed = routeGeojson;
  if (typeof routeGeojson === 'string') {
    try {
      parsed = JSON.parse(routeGeojson);
    } catch {
      return [];
    }
  }

  if (!parsed || typeof parsed !== 'object') return [];

  if (parsed.type === 'RouteWaypoints' && Array.isArray(parsed.waypoints)) {
    return parsed.waypoints
      .filter((wp) => Array.isArray(wp) && wp.length >= 2)
      .map(([lat, lng, place]) => ({
        lat: Number(lat),
        lng: Number(lng),
        place: place || '',
      }))
      .filter((wp) => Number.isFinite(wp.lat) && Number.isFinite(wp.lng));
  }

  if (parsed.type === 'LineString' && Array.isArray(parsed.coordinates)) {
    return parsed.coordinates
      .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng), place: '' }))
      .filter((wp) => Number.isFinite(wp.lat) && Number.isFinite(wp.lng));
  }

  if (parsed.type === 'Feature' && parsed.geometry?.type === 'LineString' && Array.isArray(parsed.geometry.coordinates)) {
    return parsed.geometry.coordinates
      .map(([lng, lat]) => ({ lat: Number(lat), lng: Number(lng), place: '' }))
      .filter((wp) => Number.isFinite(wp.lat) && Number.isFinite(wp.lng));
  }

  return [];
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function minDistanceToRouteKm(routeWaypoints, lat, lng) {
  if (!Array.isArray(routeWaypoints) || routeWaypoints.length === 0) return Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;

  for (const wp of routeWaypoints) {
    const d = haversineKm(wp.lat, wp.lng, lat, lng);
    if (d < min) min = d;
  }

  return min;
}
