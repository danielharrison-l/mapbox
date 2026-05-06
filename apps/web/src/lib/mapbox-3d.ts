import mapboxgl from 'mapbox-gl';
import type { PolygonGeometry } from '../types/geo';

export const STATE_ASSETS_3D_CLIP_LAYER_ID = 'state-assets-3d-clip';
export const STATE_ASSETS_3D_MODEL_LAYER_ID = 'state-assets-3d-model';
export const SELECTED_ASSET_3D_CLIP_LAYER_ID = 'selected-asset-3d-clip';
export const SELECTED_ASSET_3D_MODEL_LAYER_ID = 'selected-asset-3d-model';

const STATE_ASSETS_3D_CLIP_SOURCE_ID = 'state-assets-3d-clip';
const STATE_ASSETS_3D_MODEL_SOURCE_ID = 'state-assets-3d-model';
const SELECTED_ASSET_3D_CLIP_SOURCE_ID = 'selected-asset-3d-clip';
const SELECTED_ASSET_3D_MODEL_SOURCE_ID = 'selected-asset-3d-model';

export type MockedStateGlbModel = {
  id: string;
  name: string;
  state: 'MG' | 'PA' | 'SP';
  coordinates: [number, number];
  modelUrl: string;
};

export const MOCKED_STATE_GLB_MODELS: MockedStateGlbModel[] = [
  {
    id: 'pa-belem-glb',
    name: 'GLB mockado - Para',
    state: 'PA',
    coordinates: [-48.4896, -1.4526],
    modelUrl: '/models/para.glb',
  },
  {
    id: 'mg-belo-horizonte-glb',
    name: 'GLB mockado - Minas Gerais',
    state: 'MG',
    coordinates: [-43.9345, -19.9167],
    modelUrl: '/models/minas-gerais.glb',
  },
  {
    id: 'sp-sao-paulo-glb',
    name: 'GLB mockado - Sao Paulo',
    state: 'SP',
    coordinates: [-46.6333, -23.5505],
    modelUrl: '/models/sao-paulo.glb',
  },
];

type Asset3dModelOptions = {
  modelUrl?: string;
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
  id: string;
  name: string;
  state: MockedStateGlbModel['state'];
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
  model: MockedStateGlbModel,
  radiusMeters: number,
  offsetMeters: Asset3dModelOptions['offsetMeters'],
): GeoJsonFeature<PolygonGeometry, Record<string, never>> {
  const [lng, lat] = applyMeterOffset(model.coordinates, offsetMeters);
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
  models: MockedStateGlbModel[],
  radiusMeters: number,
  offsetMeters: Asset3dModelOptions['offsetMeters'],
): ClipPolygonCollection {
  return {
    type: 'FeatureCollection',
    features: models.map((model) => createClipPolygon(model, radiusMeters, offsetMeters)),
  };
}

function createModelSourceData(
  models: MockedStateGlbModel[],
  fallbackModelUrl: string | undefined,
  offsetMeters: Asset3dModelOptions['offsetMeters'],
): ModelPointCollection {
  return {
    type: 'FeatureCollection',
    features: models.map((model) => ({
      type: 'Feature',
      properties: {
        id: model.id,
        name: model.name,
        state: model.state,
        'model-uri': resolveModelUrl(fallbackModelUrl ?? model.modelUrl),
      },
      geometry: {
        type: 'Point',
        coordinates: applyMeterOffset(model.coordinates, offsetMeters),
      },
    })),
  };
}

function addClipAndModelLayers(
  map: mapboxgl.Map,
  models: MockedStateGlbModel[],
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
    data: createClipSourceData(models, options.clipRadiusMeters ?? 120, options.offsetMeters),
  });

  map.addSource(ids.modelSourceId, {
    type: 'geojson',
    data: createModelSourceData(models, options.modelUrl, options.offsetMeters),
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

export function getAssetBounds(models: MockedStateGlbModel[]) {
  const firstAsset = models[0];

  if (!firstAsset) {
    return null;
  }

  const bounds = new mapboxgl.LngLatBounds(firstAsset.coordinates, firstAsset.coordinates);

  for (const model of models.slice(1)) {
    bounds.extend(model.coordinates);
  }

  return bounds;
}

export function removeStateAsset3dModels(map: mapboxgl.Map) {
  removeLayerIfExists(map, STATE_ASSETS_3D_MODEL_LAYER_ID);
  removeLayerIfExists(map, STATE_ASSETS_3D_CLIP_LAYER_ID);
  removeSourceIfExists(map, STATE_ASSETS_3D_MODEL_SOURCE_ID);
  removeSourceIfExists(map, STATE_ASSETS_3D_CLIP_SOURCE_ID);
}

export function upsertStateAsset3dModels(map: mapboxgl.Map, options: Asset3dModelOptions) {
  removeStateAsset3dModels(map);

  const stateModels = MOCKED_STATE_GLB_MODELS;

  if (stateModels.length === 0) {
    return stateModels;
  }

  try {
    addClipAndModelLayers(
      map,
      stateModels,
      {
        clipLayerId: STATE_ASSETS_3D_CLIP_LAYER_ID,
        clipSourceId: STATE_ASSETS_3D_CLIP_SOURCE_ID,
        modelLayerId: STATE_ASSETS_3D_MODEL_LAYER_ID,
        modelSourceId: STATE_ASSETS_3D_MODEL_SOURCE_ID,
      },
      options,
    );
  } catch (error) {
    removeStateAsset3dModels(map);
    options.onError?.(error);
  }

  return stateModels;
}

export function removeSelectedAsset3dModel(map: mapboxgl.Map) {
  removeLayerIfExists(map, SELECTED_ASSET_3D_MODEL_LAYER_ID);
  removeLayerIfExists(map, SELECTED_ASSET_3D_CLIP_LAYER_ID);
  removeSourceIfExists(map, SELECTED_ASSET_3D_MODEL_SOURCE_ID);
  removeSourceIfExists(map, SELECTED_ASSET_3D_CLIP_SOURCE_ID);
}

export function upsertSelectedAsset3dModel(
  map: mapboxgl.Map,
  model: MockedStateGlbModel | null,
  options: Asset3dModelOptions,
) {
  removeSelectedAsset3dModel(map);

  if (!model) {
    return;
  }

  try {
    addClipAndModelLayers(
      map,
      [model],
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
