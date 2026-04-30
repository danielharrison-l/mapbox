import mapboxgl from 'mapbox-gl';
import type {
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

const METEOROLOGY_ASSETS_SOURCE_ID = 'meteorology-assets';
const SELECTED_POINT_SOURCE_ID = 'selected-asset-point';
const SELECTED_POINT_LAYER_ID = 'selected-asset-point-layer';
const SELECTED_ASSET_SOURCE_ID = 'selected-meteorology-asset';
const SELECTED_ASSET_LAYER_ID = 'selected-meteorology-asset-layer';
const SELECTED_COVERAGE_SOURCE_ID = 'selected-asset-coverage';
const SELECTED_COVERAGE_FILL_LAYER_ID = 'selected-asset-coverage-fill';
const SELECTED_COVERAGE_LINE_LAYER_ID = 'selected-asset-coverage-line';

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

export function upsertAssetLayer(map: mapboxgl.Map, geoJson: MeteorologyAssetsPointCollection) {
  const source = map.getSource(METEOROLOGY_ASSETS_SOURCE_ID);

  if (source) {
    (source as mapboxgl.GeoJSONSource).setData(geoJson);
  } else {
    map.addSource(METEOROLOGY_ASSETS_SOURCE_ID, {
      type: 'geojson',
      data: geoJson,
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
      status: String(feature.properties?.status ?? 'NOT_STARTED') as
        | 'NOT_STARTED'
        | 'STARTED'
        | 'CONCLUDED',
      coverageArea: parseCoverageArea(feature.properties?.coverageArea),
    },
  };
}
