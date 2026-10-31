import { useEffect, useMemo } from 'react';
import { divIcon, geoJSON } from 'leaflet';
import { useRouter } from 'next/router';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';

const NEPAL_CENTER = [28.2, 84.1];
const NEPAL_ZOOM = 7;
const completedWaypointIcon = divIcon({
  className: 'nepaltrex-completed-waypoint-icon',
  html: '<span aria-hidden="true">✓</span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  tooltipAnchor: [0, -12],
});
const routeWaypointIcon = divIcon({
  className: 'nepaltrex-route-waypoint-icon',
  html: '<span aria-hidden="true"></span>',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
  tooltipAnchor: [0, -8],
});

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
        .map(([lat, lng]) => [lng, lat]);
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
    const refreshSize = () => map.invalidateSize({ animate: false });
    const frame = window.requestAnimationFrame(refreshSize);
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(refreshSize);
    resizeObserver?.observe(map.getContainer());

    const normalized = normalizeGeoJson(routeGeojson);

    if (!normalized) {
      map.setView(NEPAL_CENTER, NEPAL_ZOOM);
    } else {
      const bounds = geoJSON(normalized).getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [28, 28] });
      } else {
        map.setView(NEPAL_CENTER, NEPAL_ZOOM);
      }
    }

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
    };
  }, [map, routeGeojson]);

  return null;
}

export default function TrekRouteMap({
  selectedTrek,
  nearbyStays = [],
  hoveredStayId = null,
  userLocation = null,
  guidanceWaypoint = null,
  completedWaypoints = [],
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
  const completedWaypointByIndex = useMemo(
    () => new Map((completedWaypoints || []).filter((waypoint) => waypoint.verified).map((waypoint) => [Number(waypoint.index), waypoint])),
    [completedWaypoints]
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
            color: '#15616d',
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
              color: '#fffbf6',
              fillColor: '#78290f',
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
            color: '#78290f',
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
            key={stay.id}
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
              color: isHovered ? '#00111d' : '#3ec5da',
              fillColor: isHovered ? '#15616d' : '#2199ab',
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
      {namedWaypoints.map(({ index, name, position }) => {
        const completedWaypoint = completedWaypointByIndex.get(index);
        return (
        <Marker
          key={name + '-' + index}
          position={position}
          icon={completedWaypoint ? completedWaypointIcon : routeWaypointIcon}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <strong>{completedWaypoint ? 'Completed · ' : ''}{name}</strong>
            {completedWaypoint?.completedAt && <><br /><span>Completed {new Date(completedWaypoint.completedAt).toLocaleString()}</span></>}
          </Tooltip>
        </Marker>
        );
      })}
    </MapContainer>
  );
}
