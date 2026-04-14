import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet';

const NEPAL_CENTER = [28.2, 84.1];
const NEPAL_ZOOM = 7;

function normalizeGeoJson(routeGeojson) {
  if (!routeGeojson) {
    return null;
  }

  if (typeof routeGeojson === 'string') {
    try {
      return JSON.parse(routeGeojson);
    } catch {
      return null;
    }
  }

  if (typeof routeGeojson === 'object') {
    return routeGeojson;
  }

  return null;
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

export default function TrekRouteMap({ selectedTrek }) {
  const routeGeojson = useMemo(() => normalizeGeoJson(selectedTrek?.routeGeojson), [selectedTrek]);
  const selectedTrekName = selectedTrek?.name || '';

  const routeLabelOptions = useMemo(
    () => ({
      className: 'trek-route-label',
      direction: 'top',
      permanent: true,
      sticky: false,
    }),
    []
  );

  const routeLayerOptions = useMemo(
    () => ({
      onEachFeature: (_, layer) => {
        if (!selectedTrekName) {
          return;
        }

        layer.bindTooltip(selectedTrekName, routeLabelOptions).openTooltip();
      },
    }),
    [routeLabelOptions, selectedTrekName]
  );

  return (
    <MapContainer
      center={NEPAL_CENTER}
      zoom={NEPAL_ZOOM}
      style={{ width: '100%', height: '420px' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <TrekRouteBounds routeGeojson={routeGeojson} />
      {routeGeojson && (
        <GeoJSON
          data={routeGeojson}
          {...routeLayerOptions}
          style={{
            color: '#f97316',
            weight: 5,
            opacity: 0.9,
          }}
        />
      )}
    </MapContainer>
  );
}
