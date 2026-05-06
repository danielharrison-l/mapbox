import mapboxgl from 'mapbox-gl';
import type {
  CoverageSocioeconomicData,
  IsochroneFeatureCollection,
  MeteorologyAssetPointFeature,
  MeteorologyAssetsPointCollection,
  PointGeometry,
  PolygonGeometry,
} from '../types/geo';
import { parseCoverageArea } from './geo';

export const BRAZIL_BOUNDS: mapboxgl.LngLatBoundsLike = [
  [-74.0, -34.0],
  [-28.0, 6.0],
];

export const METEOROLOGY_ASSETS_LAYER_ID = 'meteorology-assets-points';

export const METEOROLOGY_ASSETS_SOURCE_ID = 'meteorology-assets';
const ISOCHRONE_SOURCE_ID = 'asset-isochrone';
const ISOCHRONE_FILL_LAYER_ID = 'asset-isochrone-fill';
const ISOCHRONE_LINE_LAYER_ID = 'asset-isochrone-line';
const TERRAIN_SOURCE_ID = 'mapbox-dem';
const SELECTED_POINT_SOURCE_ID = 'selected-asset-point';
const SELECTED_POINT_LAYER_ID = 'selected-asset-point-layer';
const SELECTED_ASSET_SOURCE_ID = 'selected-meteorology-asset';
const SELECTED_ASSET_LAYER_ID = 'selected-meteorology-asset-layer';
const SELECTED_COVERAGE_SOURCE_ID = 'selected-asset-coverage';
const SELECTED_COVERAGE_FILL_LAYER_ID = 'selected-asset-coverage-fill';
const SELECTED_COVERAGE_LINE_LAYER_ID = 'selected-asset-coverage-line';
const COVERAGE_SOCIOECONOMIC_SOURCE_ID = 'coverage-socioeconomic-areas';
const COVERAGE_SOCIOECONOMIC_LAYER_ID = 'coverage-socioeconomic-areas-points';
const URBAN_BUILDINGS_FEATURESET_ID = 'buildings';
const URBAN_BUILDINGS_IMPORT_ID = 'basemap';
const URBAN_BUILDING_MIN_ZOOM = 14.4;
const URBAN_BUILDING_RADIUS_METERS = 900;

const urbanBuildingInteractionIds = [
  'urban-building-mouseenter',
  'urban-building-mouseleave',
  'urban-building-click',
];

const urbanBuildingsTarget = {
  featuresetId: URBAN_BUILDINGS_FEATURESET_ID,
  importId: URBAN_BUILDINGS_IMPORT_ID,
};

export type UrbanBuildingInteractionsController = {
  clear: () => void;
  dispose: () => void;
};

type UrbanBuildingInteractionsOptions = {
  getSelectedAsset: () => MeteorologyAssetPointFeature | null;
  onBuildingClick?: () => void;
};

type SelectedPointCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: PointGeometry;
    properties: Record<string, never>;
  }>;
};

type SelectedAssetCollection = {
  type: 'FeatureCollection';
  features: MeteorologyAssetPointFeature[];
};

type SelectedCoverageCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: PolygonGeometry;
    properties: {
      assetId: number;
      name: string;
      status: string;
    };
  }>;
};

type CoverageSocioeconomicAreaCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: PointGeometry;
    properties: {
      id: number;
      name: string;
      state: string | null;
      population: number;
      averageMonthlyIncome: number;
    };
  }>;
};

function createSelectedPointCollection(
  coordinates: [number, number] | null,
): SelectedPointCollection {
  return {
    type: 'FeatureCollection',
    features: coordinates
      ? [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates,
            },
            properties: {},
          },
        ]
      : [],
  };
}

function createSelectedAssetCollection(
  feature: MeteorologyAssetPointFeature | null,
): SelectedAssetCollection {
  return {
    type: 'FeatureCollection',
    features: feature ? [feature] : [],
  };
}

function createSelectedCoverageCollection(
  feature: MeteorologyAssetPointFeature | null,
): SelectedCoverageCollection {
  const coverageArea = feature?.properties.coverageArea ?? null;

  if (!feature || !coverageArea) {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: coverageArea,
        properties: {
          assetId: feature.properties.infrastructurePointId,
          name: feature.properties.name,
          status: feature.properties.status,
        },
      },
    ],
  };
}

function createCoverageSocioeconomicAreaCollection(
  data: CoverageSocioeconomicData | null,
): CoverageSocioeconomicAreaCollection {
  return {
    type: 'FeatureCollection',
    features:
      data?.areas
        .filter((area) => area.geometry)
        .map((area) => ({
          type: 'Feature',
          geometry: area.geometry as PointGeometry,
          properties: {
            id: area.id,
            name: area.name,
            state: area.state,
            population: area.population,
            averageMonthlyIncome: area.averageMonthlyIncome,
          },
        })) ?? [],
  };
}

function getDistanceMeters(
  firstCoordinates: [number, number],
  secondCoordinates: [number, number],
) {
  const earthRadiusMeters = 6_371_000;
  const firstLatitude = (firstCoordinates[1] * Math.PI) / 180;
  const secondLatitude = (secondCoordinates[1] * Math.PI) / 180;
  const latitudeDelta = ((secondCoordinates[1] - firstCoordinates[1]) * Math.PI) / 180;
  const longitudeDelta = ((secondCoordinates[0] - firstCoordinates[0]) * Math.PI) / 180;
  const halfChord =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord));
}

function isPointInPolygon(point: [number, number], polygon: PolygonGeometry) {
  const ring = polygon.coordinates[0];
  let isInside = false;

  for (let currentIndex = 0, previousIndex = ring.length - 1; currentIndex < ring.length; ) {
    const current = ring[currentIndex];
    const previous = ring[previousIndex];

    if (current && previous) {
      const intersects =
        current[1] > point[1] !== previous[1] > point[1] &&
        point[0] <
          ((previous[0] - current[0]) * (point[1] - current[1])) / (previous[1] - current[1]) +
            current[0];

      if (intersects) {
        isInside = !isInside;
      }
    }

    previousIndex = currentIndex;
    currentIndex += 1;
  }

  return isInside;
}

function isUrbanBuildingInteractionEnabled(
  map: mapboxgl.Map,
  lngLat: mapboxgl.LngLat,
  selectedAsset: MeteorologyAssetPointFeature | null,
) {
  if (!selectedAsset || map.getZoom() < URBAN_BUILDING_MIN_ZOOM) {
    return false;
  }

  const coordinates: [number, number] = [lngLat.lng, lngLat.lat];

  if (
    selectedAsset.properties.coverageArea &&
    isPointInPolygon(coordinates, selectedAsset.properties.coverageArea)
  ) {
    return true;
  }

  return (
    getDistanceMeters(selectedAsset.geometry.coordinates, coordinates) <=
    URBAN_BUILDING_RADIUS_METERS
  );
}

function setBuildingFeatureState(
  map: mapboxgl.Map,
  feature: mapboxgl.TargetFeature | null,
  state: Record<string, boolean>,
) {
  if (!feature) {
    return;
  }

  try {
    map.setFeatureState(feature, state);
  } catch (error) {
    console.debug('Failed to update urban building state', error);
  }
}

function removeUrbanBuildingInteractions(map: mapboxgl.Map) {
  for (const interactionId of urbanBuildingInteractionIds) {
    try {
      map.removeInteraction(interactionId);
    } catch {
      // Interaction IDs are best-effort because style reloads may clear them first.
    }
  }
}

function escapePopupText(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function upsertAssetLayer(map: mapboxgl.Map, geoJson: MeteorologyAssetsPointCollection) {
  const source = map.getSource(METEOROLOGY_ASSETS_SOURCE_ID);

  if (source) {
    (source as mapboxgl.GeoJSONSource).setData(geoJson);
  } else {
    map.addSource(METEOROLOGY_ASSETS_SOURCE_ID, {
      type: 'geojson',
      data: geoJson,
      generateId: true,
    });
  }

  if (map.getLayer(METEOROLOGY_ASSETS_LAYER_ID)) {
    return;
  }

  map.addLayer({
    id: METEOROLOGY_ASSETS_LAYER_ID,
    type: 'circle',
    source: METEOROLOGY_ASSETS_SOURCE_ID,
    paint: {
      'circle-color': [
        'match',
        ['get', 'status'],
        'NOT_STARTED',
        '#64748b',
        'STARTED',
        '#f59e0b',
        'CONCLUDED',
        '#16a34a',
        '#2563eb',
      ],
      'circle-radius': 7,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  });
}

export function upsertIsochroneLayer(
  map: mapboxgl.Map,
  geoJson: IsochroneFeatureCollection | null,
) {
  const source = map.getSource(ISOCHRONE_SOURCE_ID);
  const data = geoJson ?? {
    type: 'FeatureCollection',
    features: [],
  };

  if (source) {
    (source as mapboxgl.GeoJSONSource).setData(data);
  } else {
    map.addSource(ISOCHRONE_SOURCE_ID, {
      type: 'geojson',
      data,
    });
  }

  if (!map.getLayer(ISOCHRONE_FILL_LAYER_ID)) {
    const beforeAssetLayer = map.getLayer(METEOROLOGY_ASSETS_LAYER_ID)
      ? METEOROLOGY_ASSETS_LAYER_ID
      : undefined;

    map.addLayer(
      {
        id: ISOCHRONE_FILL_LAYER_ID,
        type: 'fill',
        source: ISOCHRONE_SOURCE_ID,
        paint: {
          'fill-color': ['match', ['get', 'contour'], 15, '#22c55e', 30, '#0ea5e9', '#2563eb'],
          'fill-opacity': ['match', ['get', 'contour'], 15, 0.26, 30, 0.16, 0.18],
        },
      },
      beforeAssetLayer,
    );
  }

  if (!map.getLayer(ISOCHRONE_LINE_LAYER_ID)) {
    const beforeAssetLayer = map.getLayer(METEOROLOGY_ASSETS_LAYER_ID)
      ? METEOROLOGY_ASSETS_LAYER_ID
      : undefined;

    map.addLayer(
      {
        id: ISOCHRONE_LINE_LAYER_ID,
        type: 'line',
        source: ISOCHRONE_SOURCE_ID,
        paint: {
          'line-color': ['match', ['get', 'contour'], 15, '#15803d', 30, '#0369a1', '#1d4ed8'],
          'line-width': 2,
          'line-opacity': 0.84,
        },
      },
      beforeAssetLayer,
    );
  }
}

export function enableTerrain(map: mapboxgl.Map) {
  if (!map.getSource(TERRAIN_SOURCE_ID)) {
    map.addSource(TERRAIN_SOURCE_ID, {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
  }

  map.setTerrain({
    source: TERRAIN_SOURCE_ID,
    exaggeration: 1.25,
  });
}

export function configureUrbanBuildingStyle(map: mapboxgl.Map) {
  try {
    map.setConfigProperty('basemap', 'colorBuildingHighlight', '#f97316');
    map.setConfigProperty('basemap', 'colorBuildingSelect', '#0f172a');
    map.setConfigProperty('basemap', 'show3dLandmarks', false);
  } catch (error) {
    console.debug('Mapbox Standard building config is not available for this style', error);
  }
}

export function hasUrbanBuildingAtPoint(
  map: mapboxgl.Map,
  point: mapboxgl.Point,
  lngLat: mapboxgl.LngLat,
  selectedAsset: MeteorologyAssetPointFeature | null,
) {
  if (!isUrbanBuildingInteractionEnabled(map, lngLat, selectedAsset)) {
    return false;
  }

  try {
    return (
      map.queryRenderedFeatures(point, {
        target: urbanBuildingsTarget,
      }).length > 0
    );
  } catch {
    return false;
  }
}

export function installUrbanBuildingInteractions(
  map: mapboxgl.Map,
  options: UrbanBuildingInteractionsOptions,
): UrbanBuildingInteractionsController {
  let hoveredBuilding: mapboxgl.TargetFeature | null = null;
  let selectedBuilding: mapboxgl.TargetFeature | null = null;
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 14,
    className: 'urban-building-popup',
  });

  const clear = () => {
    setBuildingFeatureState(map, hoveredBuilding, { highlight: false });
    setBuildingFeatureState(map, selectedBuilding, { select: false });
    hoveredBuilding = null;
    selectedBuilding = null;
    popup.remove();
  };

  removeUrbanBuildingInteractions(map);

  map.addInteraction('urban-building-mouseenter', {
    type: 'mouseenter',
    target: urbanBuildingsTarget,
    handler: ({ feature, lngLat }) => {
      const selectedAsset = options.getSelectedAsset();

      if (
        !feature ||
        !selectedAsset ||
        !isUrbanBuildingInteractionEnabled(map, lngLat, selectedAsset)
      ) {
        return;
      }

      setBuildingFeatureState(map, hoveredBuilding, { highlight: false });
      hoveredBuilding = feature;
      setBuildingFeatureState(map, feature, { highlight: true });
      map.getCanvas().style.cursor = 'pointer';
    },
  });

  map.addInteraction('urban-building-mouseleave', {
    type: 'mouseleave',
    target: urbanBuildingsTarget,
    handler: ({ feature }) => {
      if (hoveredBuilding && feature?.id === hoveredBuilding.id) {
        setBuildingFeatureState(map, hoveredBuilding, { highlight: false });
        hoveredBuilding = null;
        map.getCanvas().style.cursor = '';
      }

      return false;
    },
  });

  map.addInteraction('urban-building-click', {
    type: 'click',
    target: urbanBuildingsTarget,
    handler: ({ feature, lngLat, preventDefault }) => {
      const selectedAsset = options.getSelectedAsset();

      if (
        !feature ||
        !selectedAsset ||
        !isUrbanBuildingInteractionEnabled(map, lngLat, selectedAsset)
      ) {
        return;
      }

      preventDefault();
      options.onBuildingClick?.();
      setBuildingFeatureState(map, selectedBuilding, { select: false });
      selectedBuilding = feature;
      setBuildingFeatureState(map, feature, { select: true });

      popup
        .setLngLat(lngLat)
        .setHTML(
          `<div style="display:grid;gap:3px;min-width:170px">
            <strong>Prédio urbano selecionado</strong>
            <span>${escapePopupText(selectedAsset.properties.name)}</span>
            <span style="color:#64748b">Área de influência do ativo</span>
          </div>`,
        )
        .addTo(map);

      map.easeTo({
        center: lngLat,
        zoom: Math.max(map.getZoom(), 16),
        pitch: Math.max(map.getPitch(), 60),
        duration: 500,
      });

      return true;
    },
  });

  return {
    clear,
    dispose: () => {
      clear();
      removeUrbanBuildingInteractions(map);
    },
  };
}

export function upsertSelectedPointLayer(map: mapboxgl.Map, coordinates: [number, number] | null) {
  const geoJson = createSelectedPointCollection(coordinates);
  const source = map.getSource(SELECTED_POINT_SOURCE_ID);

  if (source) {
    (source as mapboxgl.GeoJSONSource).setData(geoJson);
  } else {
    map.addSource(SELECTED_POINT_SOURCE_ID, {
      type: 'geojson',
      data: geoJson,
    });
  }

  if (map.getLayer(SELECTED_POINT_LAYER_ID)) {
    return;
  }

  map.addLayer({
    id: SELECTED_POINT_LAYER_ID,
    type: 'circle',
    source: SELECTED_POINT_SOURCE_ID,
    paint: {
      'circle-color': '#2563eb',
      'circle-radius': 9,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 3,
    },
  });
}

export function upsertSelectedAssetLayer(
  map: mapboxgl.Map,
  feature: MeteorologyAssetPointFeature | null,
) {
  const geoJson = createSelectedAssetCollection(feature);
  const source = map.getSource(SELECTED_ASSET_SOURCE_ID);

  if (source) {
    (source as mapboxgl.GeoJSONSource).setData(geoJson);
  } else {
    map.addSource(SELECTED_ASSET_SOURCE_ID, {
      type: 'geojson',
      data: geoJson,
    });
  }

  if (map.getLayer(SELECTED_ASSET_LAYER_ID)) {
    return;
  }

  map.addLayer({
    id: SELECTED_ASSET_LAYER_ID,
    type: 'circle',
    source: SELECTED_ASSET_SOURCE_ID,
    paint: {
      'circle-color': '#ffffff',
      'circle-radius': 12,
      'circle-stroke-color': '#2563eb',
      'circle-stroke-width': 4,
    },
  });
}

export function upsertSelectedCoverageLayer(
  map: mapboxgl.Map,
  feature: MeteorologyAssetPointFeature | null,
) {
  const geoJson = createSelectedCoverageCollection(feature);
  const source = map.getSource(SELECTED_COVERAGE_SOURCE_ID);

  if (source) {
    (source as mapboxgl.GeoJSONSource).setData(geoJson);
  } else {
    map.addSource(SELECTED_COVERAGE_SOURCE_ID, {
      type: 'geojson',
      data: geoJson,
    });
  }

  if (!map.getLayer(SELECTED_COVERAGE_FILL_LAYER_ID)) {
    const beforeAssetLayer = map.getLayer(METEOROLOGY_ASSETS_LAYER_ID)
      ? METEOROLOGY_ASSETS_LAYER_ID
      : undefined;

    map.addLayer(
      {
        id: SELECTED_COVERAGE_FILL_LAYER_ID,
        type: 'fill',
        source: SELECTED_COVERAGE_SOURCE_ID,
        paint: {
          'fill-color': [
            'match',
            ['get', 'status'],
            'NOT_STARTED',
            '#64748b',
            'STARTED',
            '#f59e0b',
            'CONCLUDED',
            '#16a34a',
            '#2563eb',
          ],
          'fill-opacity': 0.22,
        },
      },
      beforeAssetLayer,
    );
  }

  if (!map.getLayer(SELECTED_COVERAGE_LINE_LAYER_ID)) {
    const beforeAssetLayer = map.getLayer(METEOROLOGY_ASSETS_LAYER_ID)
      ? METEOROLOGY_ASSETS_LAYER_ID
      : undefined;

    map.addLayer(
      {
        id: SELECTED_COVERAGE_LINE_LAYER_ID,
        type: 'line',
        source: SELECTED_COVERAGE_SOURCE_ID,
        paint: {
          'line-color': '#0f172a',
          'line-opacity': 0.75,
          'line-width': 2,
          'line-dasharray': [2, 1],
        },
      },
      beforeAssetLayer,
    );
  }
}

export function upsertCoverageSocioeconomicLayer(
  map: mapboxgl.Map,
  data: CoverageSocioeconomicData | null,
) {
  const geoJson = createCoverageSocioeconomicAreaCollection(data);
  const source = map.getSource(COVERAGE_SOCIOECONOMIC_SOURCE_ID);

  if (source) {
    (source as mapboxgl.GeoJSONSource).setData(geoJson);
  } else {
    map.addSource(COVERAGE_SOCIOECONOMIC_SOURCE_ID, {
      type: 'geojson',
      data: geoJson,
    });
  }

  if (map.getLayer(COVERAGE_SOCIOECONOMIC_LAYER_ID)) {
    return;
  }

  map.addLayer({
    id: COVERAGE_SOCIOECONOMIC_LAYER_ID,
    type: 'circle',
    source: COVERAGE_SOCIOECONOMIC_SOURCE_ID,
    paint: {
      'circle-color': '#10b981',
      'circle-radius': 6,
      'circle-stroke-color': '#064e3b',
      'circle-stroke-width': 2,
      'circle-opacity': 0.92,
    },
  });
}

export function getPolygonBounds(polygon: PolygonGeometry): mapboxgl.LngLatBounds | null {
  const firstPosition = polygon.coordinates[0]?.[0];

  if (!firstPosition) {
    return null;
  }

  const bounds = new mapboxgl.LngLatBounds(firstPosition, firstPosition);

  for (const ring of polygon.coordinates) {
    for (const position of ring) {
      bounds.extend(position);
    }
  }

  return bounds;
}

export function readAssetFeature(
  feature: mapboxgl.MapboxGeoJSONFeature,
): MeteorologyAssetPointFeature | null {
  if (feature.geometry.type !== 'Point') {
    return null;
  }

  const coordinates = feature.geometry.coordinates;

  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    coordinates.some((coordinate) => typeof coordinate !== 'number')
  ) {
    return null;
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: coordinates as [number, number],
    },
    properties: {
      id: Number(feature.properties?.id),
      infrastructurePointId: Number(feature.properties?.infrastructurePointId),
      name: String(feature.properties?.name ?? ''),
      description: feature.properties?.description ? String(feature.properties.description) : null,
      municipalityId: Number(feature.properties?.municipalityId),
      municipalityName: feature.properties?.municipalityName
        ? String(feature.properties.municipalityName)
        : null,
      municipalityState: feature.properties?.municipalityState
        ? String(feature.properties.municipalityState)
        : null,
      status: String(feature.properties?.status ?? 'NOT_STARTED') as
        | 'NOT_STARTED'
        | 'STARTED'
        | 'CONCLUDED',
      coverageArea: parseCoverageArea(feature.properties?.coverageArea),
    },
  };
}
