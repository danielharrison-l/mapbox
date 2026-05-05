import mapboxgl from 'mapbox-gl';
import type {
  MeteorologyAssetPointFeature,
  MeteorologyAssetsPointCollection,
  PolygonGeometry,
} from '../types/geo';

export const PARA_ASSETS_3D_CLIP_LAYER_ID = 'para-assets-3d-clip';
export const PARA_ASSETS_3D_MODEL_LAYER_ID = 'para-assets-3d-model';
export const SELECTED_ASSET_3D_CLIP_LAYER_ID = 'selected-asset-3d-clip';
export const SELECTED_ASSET_3D_MODEL_LAYER_ID = 'selected-asset-3d-model';

const PARA_ASSETS_3D_CLIP_SOURCE_ID = 'para-assets-3d-clip';
const PARA_ASSETS_3D_MODEL_SOURCE_ID = 'para-assets-3d-model';
const SELECTED_ASSET_3D_CLIP_SOURCE_ID = 'selected-asset-3d-clip';
const SELECTED_ASSET_3D_MODEL_SOURCE_ID = 'selected-asset-3d-model';

type Asset3dModelOptions = {
  modelUrl: string;
  scale?: [number, number, number];
  rotation?: [number, number, number];
  offsetMeters?: {
    east: number;
    north: number;
  };
  clipRadiusMeters?: number;
  minZoom?: number;
  onReady?: () => void;
  onError?: (error: unknown) => void;
};

type GeoJsonFeature<TGeometry, TProperties> = {
  type: 'Feature';
  geometry: TGeometry;
  properties: TProperties;
};

type GeoJsonFeatureCollection<TGeometry, TProperties> = {
  type: 'FeatureCollection';
  features: Array<GeoJsonFeature<TGeometry, TProperties>>;
};

type ModelPointGeometry = {
  type: 'Point';
  coordinates: [number, number];
};

type ModelPointProperties = {
  'model-uri': string;
};

type ModelPointCollection = GeoJsonFeatureCollection<ModelPointGeometry, ModelPointProperties>;
type ClipPolygonCollection = GeoJsonFeatureCollection<PolygonGeometry, Record<string, never>>;

export type MapFrameRateMeasurement = {
  durationMs: number;
  frames: number;
  averageFps: number;
  maxFrameTimeMs: number;
  measuredAt: string;
};

function removeLayerIfExists(map: mapboxgl.Map, layerId: string) {
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
}

function removeSourceIfExists(map: mapboxgl.Map, sourceId: string) {
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }
}

function resolveModelUrl(modelUrl: string): string {
  return new URL(modelUrl, window.location.href).href;
}

function applyMeterOffset(
  coordinates: [number, number],
  offsetMeters?: {
    east: number;
    north: number;
  },
): [number, number] {
  if (!offsetMeters) {
    return coordinates;
  }

  const [lng, lat] = coordinates;
  const latOffset = offsetMeters.north / 111_320;
  const lngOffset = offsetMeters.east / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));

  return [lng + lngOffset, lat + latOffset];
}

function createClipPolygon(
  asset: MeteorologyAssetPointFeature,
  radiusMeters: number,
  offsetMeters: Asset3dModelOptions['offsetMeters'],
): GeoJsonFeature<PolygonGeometry, Record<string, never>> {
  const [lng, lat] = applyMeterOffset(asset.geometry.coordinates, offsetMeters);
  const latOffset = radiusMeters / 111_320;
  const lngOffset = radiusMeters / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [lng - lngOffset, lat - latOffset],
          [lng + lngOffset, lat - latOffset],
          [lng + lngOffset, lat + latOffset],
          [lng - lngOffset, lat + latOffset],
          [lng - lngOffset, lat - latOffset],
        ],
      ],
    },
  };
}

function createClipSourceData(
  assets: MeteorologyAssetPointFeature[],
  radiusMeters: number,
  offsetMeters: Asset3dModelOptions['offsetMeters'],
): ClipPolygonCollection {
  return {
    type: 'FeatureCollection',
    features: assets.map((asset) => createClipPolygon(asset, radiusMeters, offsetMeters)),
  };
}

function createModelSourceData(
  assets: MeteorologyAssetPointFeature[],
  modelUrl: string,
  offsetMeters: Asset3dModelOptions['offsetMeters'],
): ModelPointCollection {
  const modelUri = resolveModelUrl(modelUrl);

  return {
    type: 'FeatureCollection',
    features: assets.map((asset) => ({
      type: 'Feature',
      properties: {
        'model-uri': modelUri,
      },
      geometry: {
        type: 'Point',
        coordinates: applyMeterOffset(asset.geometry.coordinates, offsetMeters),
      },
    })),
  };
}

function addClipAndModelLayers(
  map: mapboxgl.Map,
  assets: MeteorologyAssetPointFeature[],
  ids: {
    clipLayerId: string;
    clipSourceId: string;
    modelLayerId: string;
    modelSourceId: string;
  },
  options: Asset3dModelOptions,
) {
  map.addSource(ids.clipSourceId, {
    type: 'geojson',
    data: createClipSourceData(assets, options.clipRadiusMeters ?? 120, options.offsetMeters),
  });

  map.addSource(ids.modelSourceId, {
    type: 'geojson',
    data: createModelSourceData(assets, options.modelUrl, options.offsetMeters),
  });

  map.addLayer({
    id: ids.clipLayerId,
    type: 'clip',
    source: ids.clipSourceId,
    layout: {
      'clip-layer-types': ['symbol', 'model'],
      'clip-layer-scope': ['basemap'],
    },
  } as mapboxgl.AnyLayer);

  map.addLayer({
    id: ids.modelLayerId,
    type: 'model',
    slot: 'middle',
    source: ids.modelSourceId,
    minzoom: options.minZoom ?? 15,
    layout: {
      'model-id': ['get', 'model-uri'],
    },
    paint: {
      'model-opacity': 1,
      'model-rotation': options.rotation ?? [0, 0, 35],
      'model-scale': options.scale ?? [0.8, 0.8, 1.2],
      'model-color-mix-intensity': 0,
      'model-cast-shadows': true,
      'model-emissive-strength': 0.8,
    },
  } as mapboxgl.AnyLayer);

  map.once('idle', () => options.onReady?.());
  map.triggerRepaint();
}

function isParaAsset(asset: MeteorologyAssetPointFeature) {
  return asset.properties.municipalityState === 'PA';
}

export function getParaAssets(assetsGeoJson: MeteorologyAssetsPointCollection) {
  return assetsGeoJson.features.filter(isParaAsset);
}

export function getAssetBounds(assets: MeteorologyAssetPointFeature[]) {
  const firstAsset = assets[0];

  if (!firstAsset) {
    return null;
  }

  const bounds = new mapboxgl.LngLatBounds(
    firstAsset.geometry.coordinates,
    firstAsset.geometry.coordinates,
  );

  for (const asset of assets.slice(1)) {
    bounds.extend(asset.geometry.coordinates);
  }

  return bounds;
}

export function removeParaAsset3dModels(map: mapboxgl.Map) {
  removeLayerIfExists(map, PARA_ASSETS_3D_MODEL_LAYER_ID);
  removeLayerIfExists(map, PARA_ASSETS_3D_CLIP_LAYER_ID);
  removeSourceIfExists(map, PARA_ASSETS_3D_MODEL_SOURCE_ID);
  removeSourceIfExists(map, PARA_ASSETS_3D_CLIP_SOURCE_ID);
}

export function upsertParaAsset3dModels(
  map: mapboxgl.Map,
  assetsGeoJson: MeteorologyAssetsPointCollection,
  options: Asset3dModelOptions,
) {
  removeParaAsset3dModels(map);

  const paraAssets = getParaAssets(assetsGeoJson);

  if (paraAssets.length === 0) {
    return paraAssets;
  }

  try {
    addClipAndModelLayers(
      map,
      paraAssets,
      {
        clipLayerId: PARA_ASSETS_3D_CLIP_LAYER_ID,
        clipSourceId: PARA_ASSETS_3D_CLIP_SOURCE_ID,
        modelLayerId: PARA_ASSETS_3D_MODEL_LAYER_ID,
        modelSourceId: PARA_ASSETS_3D_MODEL_SOURCE_ID,
      },
      options,
    );
  } catch (error) {
    removeParaAsset3dModels(map);
    options.onError?.(error);
  }

  return paraAssets;
}

export function removeSelectedAsset3dModel(map: mapboxgl.Map) {
  removeLayerIfExists(map, SELECTED_ASSET_3D_MODEL_LAYER_ID);
  removeLayerIfExists(map, SELECTED_ASSET_3D_CLIP_LAYER_ID);
  removeSourceIfExists(map, SELECTED_ASSET_3D_MODEL_SOURCE_ID);
  removeSourceIfExists(map, SELECTED_ASSET_3D_CLIP_SOURCE_ID);
}

export function upsertSelectedAsset3dModel(
  map: mapboxgl.Map,
  asset: MeteorologyAssetPointFeature | null,
  options: Asset3dModelOptions,
) {
  removeSelectedAsset3dModel(map);

  if (!asset) {
    return;
  }

  try {
    addClipAndModelLayers(
      map,
      [asset],
      {
        clipLayerId: SELECTED_ASSET_3D_CLIP_LAYER_ID,
        clipSourceId: SELECTED_ASSET_3D_CLIP_SOURCE_ID,
        modelLayerId: SELECTED_ASSET_3D_MODEL_LAYER_ID,
        modelSourceId: SELECTED_ASSET_3D_MODEL_SOURCE_ID,
      },
      options,
    );
  } catch (error) {
    removeSelectedAsset3dModel(map);
    options.onError?.(error);
  }
}

export function measureMapFrameRate(durationMs = 5000): Promise<MapFrameRateMeasurement> {
  const startedAt = performance.now();
  let lastFrameAt = startedAt;
  let maxFrameTimeMs = 0;
  let frames = 0;

  return new Promise((resolve) => {
    function tick(frameAt: number) {
      frames += 1;
      maxFrameTimeMs = Math.max(maxFrameTimeMs, frameAt - lastFrameAt);
      lastFrameAt = frameAt;

      const elapsedMs = frameAt - startedAt;

      if (elapsedMs < durationMs) {
        requestAnimationFrame(tick);
        return;
      }

      resolve({
        durationMs: elapsedMs,
        frames,
        averageFps: frames / (elapsedMs / 1000),
        maxFrameTimeMs,
        measuredAt: new Date().toISOString(),
      });
    }

    requestAnimationFrame(tick);
  });
}
