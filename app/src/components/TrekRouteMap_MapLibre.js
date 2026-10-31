import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';

const NEPAL_CENTER = [28.2, 84.1];
const NEPAL_ZOOM = 7;

function toLatLng(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return [lat, lng];
}

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
    if (
      routeGeojson.type === 'RouteWaypoints' &&
      Array.isArray(routeGeojson.waypoints)
    ) {
      const coords = routeGeojson.waypoints
        .filter((waypoint) => Array.isArray(waypoint))
        .map(([lat, lng]) => toLatLng(lat, lng))
        .filter(Boolean)
        .map(([lat, lng]) => [lng, lat]); // GeoJSON is [lng, lat]
      if (coords.length < 2) return null;
      return {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: coords },
      };
    }

    if (
      routeGeojson.type === 'Feature' ||
      routeGeojson.type === 'FeatureCollection'
    ) {
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
  const raw =
    typeof routeGeojson === 'string'
      ? (() => {
          try {
            return JSON.parse(routeGeojson);
          } catch {
            return null;
          }
        })()
      : routeGeojson;
  if (!raw || raw.type !== 'RouteWaypoints' || !Array.isArray(raw.waypoints))
    return [];
  return raw.waypoints.flatMap((waypoint, index) => {
    if (!Array.isArray(waypoint) || !waypoint[2] || typeof waypoint[2] !== 'string') return [];
    const position = toLatLng(waypoint[0], waypoint[1]);
    return position ? [{ index, name: waypoint[2], position }] : [];
  });
}

function TrekRouteBounds({ routeGeojson }) {
  const map = useMap();

  useEffect(() => {
    const normalized = normalizeGeoJson(routeGeojson);

    if (!normalized) {
      map.setView(NEPAL_CENTER, NEPAL_ZOOM);
      return;
    }

    const bounds = GeoJSON(normalized).getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [28, 28] });
      return;
    }

    map.setView(NEPAL_CENTER, NEPAL_ZOOM);
  }, [map, routeGeojson]);

  return null;
}

export default function TrekRouteMap({
  selectedTrek,
  nearbyStays = [],
  hoveredStayId = null,
  userLocation = null,
  guidanceWaypoint = null,
}) {
  const router = useRouter();
  const routeGeojson = useMemo(
    () => normalizeGeoJson(selectedTrek?.routeGeojson),
    [selectedTrek]
  );
  const namedWaypoints = useMemo(
    () => extractNamedWaypoints(selectedTrek?.routeGeojson),
    [selectedTrek]
  );
  const userPosition = toLatLng(userLocation?.latitude, userLocation?.longitude);
  const guidancePosition = toLatLng(guidanceWaypoint?.lat, guidanceWaypoint?.lng);

  return (
    <MapContainer
      center={NEPAL_CENTER}
      zoom={NEPAL_ZOOM}
      style={{ width: '100%', height: '480px' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <TrekRouteBounds routeGeojson={routeGeojson} />
      {routeGeojson && (
        <GeoJSON
          key="route-layer"
          data={routeGeojson}
          style={{
            color: '#15616D',
            weight: 5,
            opacity: 0.9,
          }}
        />
      )}
      {userPosition && (
          <CircleMarker
            center={userPosition}
            radius={9}
            pathOptions={{
              color: '#FFECD1',
              fillColor: '#78290F',
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} permanent>
              Your current location
            </Tooltip>
          </CircleMarker>
        )}
      {userPosition && guidancePosition && (
        <Polyline
          positions={[
            userPosition,
            guidancePosition,
          ]}
          pathOptions={{
            color: '#78290F',
            weight: 3,
            dashArray: '7 8',
            opacity: 0.9,
          }}
        />
      )}
      {nearbyStays.map((stay) => {
        const position = toLatLng(stay.latitude, stay.longitude);
        if (!position) return null;
        const isHovered = stay.id === hoveredStayId;
        return (
          <CircleMarker
            key={`stay-${stay.id}`}
            center={position}
            radius={isHovered ? 11 : 7}
            eventHandlers={{
              click: () => {
                if (stay.slug) {
                  router.push(`/stays/${stay.slug}`);
                }
              },
            }}
            pathOptions={{
              color: isHovered ? '#001524' : '#15616D',
              fillColor: isHovered ? '#FF7D00' : '#3EC5DA',
              fillOpacity: 0.92,
              weight: isHovered ? 3 : 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]} permanent={isHovered}>
              <strong>{stay.name}</strong>
              <br />
              <span style={{ fontSize: '0.75em', opacity: 0.8 }}>
                {position[0].toFixed(5)}, {position[1].toFixed(5)}
              </span>
              <br />
              <span style={{ fontSize: '0.72em', opacity: 0.9 }}>
                Click to view stay
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
      {namedWaypoints.map(({ index, name, position }) => (
        <CircleMarker
          key={`wp-${index}`}
          center={position}
          radius={5}
          pathOptions={{
            color: '#001524',
            fillColor: '#BFECF3',
            fillOpacity: 1,
            weight: 2,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            {name}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
