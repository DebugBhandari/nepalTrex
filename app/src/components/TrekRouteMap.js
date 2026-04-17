import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import L from 'leaflet';
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';

const NEPAL_CENTER = [28.2, 84.1];
const NEPAL_ZOOM = 7;

function normalizeGeoJson(routeGeojson) {
  if (!routeGeojson) {
    return null;
  }

  if (typeof routeGeojson === 'string') {
    try {
      return normalizeGeoJson(JSON.parse(routeGeojson));
    } catch {
      return null;
    }
  }

  if (typeof routeGeojson === 'object') {
    if (!routeGeojson.type) {
      return null;
    }

    // Convert our custom RouteWaypoints format → GeoJSON LineString Feature
    if (routeGeojson.type === 'RouteWaypoints' && Array.isArray(routeGeojson.waypoints)) {
      const coords = routeGeojson.waypoints
        .filter(([lat, lng]) => lat !== '' && lng !== '' && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng)))
        .map(([lat, lng]) => [Number(lng), Number(lat)]); // GeoJSON is [lng, lat]
      if (coords.length < 2) return null;
      return {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      };
    }

    if (routeGeojson.type === 'Feature' || routeGeojson.type === 'FeatureCollection') {
      return routeGeojson;
    }

    // Wrap geometry objects such as LineString into a Feature for consistent rendering.
    return {
      type: 'Feature',
      properties: {},
      geometry: routeGeojson,
    };
  }

  return null;
}

function extractNamedWaypoints(routeGeojson) {
  if (!routeGeojson || typeof routeGeojson !== 'object') return [];
  const raw = typeof routeGeojson === 'string' ? (() => { try { return JSON.parse(routeGeojson); } catch { return null; } })() : routeGeojson;
  if (!raw || raw.type !== 'RouteWaypoints' || !Array.isArray(raw.waypoints)) return [];
  return raw.waypoints.filter(wp => Array.isArray(wp) && wp[2] && typeof wp[2] === 'string');
}

function TrekRouteBounds({ routeGeojson }) {
  const map = useMap();

  useEffect(() => {
    const normalized = normalizeGeoJson(routeGeojson);

    if (!normalized) {
      map.setView(NEPAL_CENTER, NEPAL_ZOOM);
      return;
    }

    const bounds = L.geoJSON(normalized).getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [28, 28] });
      return;
    }

    map.setView(NEPAL_CENTER, NEPAL_ZOOM);
  }, [map, routeGeojson]);

  return null;
}

export default function TrekRouteMap({ selectedTrek, nearbyStays = [], hoveredStayId = null }) {
  const router = useRouter();
  const routeGeojson = useMemo(() => normalizeGeoJson(selectedTrek?.routeGeojson), [selectedTrek]);
  const namedWaypoints = useMemo(() => extractNamedWaypoints(selectedTrek?.routeGeojson), [selectedTrek]);

  return (
    <MapContainer
      center={NEPAL_CENTER}
      zoom={NEPAL_ZOOM}
      style={{ width: '100%', height: '480px' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <TrekRouteBounds routeGeojson={routeGeojson} />
      {routeGeojson && (
        <GeoJSON
          key="route-layer"
          data={routeGeojson}
          style={{
            color: '#0f766e',
            weight: 5,
            opacity: 0.9,
          }}
        />
      )}
      {nearbyStays.map((stay) => {
        if (!stay.latitude || !stay.longitude) return null;
        const isHovered = stay.id === hoveredStayId;
        return (
          <CircleMarker
            key={`stay-${stay.id}`}
            center={[Number(stay.latitude), Number(stay.longitude)]}
            radius={isHovered ? 11 : 7}
            eventHandlers={{
              click: () => {
                if (stay.slug) {
                  router.push(`/stays/${stay.slug}`);
                }
              },
            }}
            pathOptions={{
              color: isHovered ? '#92400e' : '#1e40af',
              fillColor: isHovered ? '#f59e0b' : '#3b82f6',
              fillOpacity: 0.92,
              weight: isHovered ? 3 : 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} permanent={isHovered}>
              <strong>{stay.name}</strong>
              <br />
              <span style={{ fontSize: '0.75em', opacity: 0.8 }}>
                {Number(stay.latitude).toFixed(5)}, {Number(stay.longitude).toFixed(5)}
              </span>
              <br />
              <span style={{ fontSize: '0.72em', opacity: 0.9 }}>Click to view stay</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
      {namedWaypoints.map(([lat, lng, name], i) => (
        <CircleMarker
          key={`wp-${i}`}
          center={[lat, lng]}
          radius={5}
          pathOptions={{ color: '#285A48', fillColor: '#408A71', fillOpacity: 1, weight: 2 }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            {name}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
