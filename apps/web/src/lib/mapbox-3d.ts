import mapboxgl from 'mapbox-gl';
import type { MeteorologyAssetPointFeature, PolygonGeometry } from '../types/geo';

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
  state: 'BA' | 'MG' | 'PA' | 'SP';
  coordinates: [number, number];
  modelUrl: string;
  scaleMultiplier?: [number, number, number];
  translation?: [number, number, number];
};

type StateGlbModelConfig = {
  state: MockedStateGlbModel['state'];
  modelUrl: string;
  namePrefix: string;
  scaleMultiplier: [number, number, number];
  translation: [number, number, number];
};

const STATE_GLB_MODEL_CONFIGS: Record<MockedStateGlbModel['state'], StateGlbModelConfig> = {
  BA: {
    state: 'BA',
    modelUrl: '/models/blender-otimizado.glb',
    namePrefix: 'Otimizado',
    scaleMultiplier: [0.6, 0.6, 0.6],
    translation: [0, 0, 1],
  },
  PA: {
    state: 'PA',
    modelUrl: '/models/blender001.glb',
    namePrefix: 'Teste',
    scaleMultiplier: [0.6, 0.6, 0.6],
    translation: [0, 0, 1],
  },
  MG: {
    state: 'MG',
    modelUrl: '/models/tower.glb',
    namePrefix: 'Tower',
    scaleMultiplier: [0.22, 0.22, 0.22],
    translation: [0, 0, 0],
  },
  SP: {
    state: 'SP',
    modelUrl: '/models/blender001.glb',
    namePrefix: 'Teste',
    scaleMultiplier: [0.6, 0.6, 0.6],
    translation: [0, 0, 1],
  },
};

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
  'model-id': string;
  'model-scale': [number, number, number];
  'model-translation': [number, number, number];
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

function getRuntimeModelId(model: MockedStateGlbModel, fallbackModelUrl?: string) {
  const modelUrl = fallbackModelUrl ?? model.modelUrl;
  const modelFileName =
    modelUrl
      .split('/')
      .pop()
      ?.replace(/\.glb$/i, '') || model.id;
  const normalizedModelId = modelFileName.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();

  return `runtime-${normalizedModelId}`;
}

function getStateGlbModelConfig(state: string | null): StateGlbModelConfig | null {
  if (state === 'BA' || state === 'PA' || state === 'MG' || state === 'SP') {
    return STATE_GLB_MODEL_CONFIGS[state];
  }

  return null;
}

export function createStateAssetGlbModels(
  assets: MeteorologyAssetPointFeature[],
): MockedStateGlbModel[] {
  return assets.flatMap((asset) => {
    const config = getStateGlbModelConfig(asset.properties.municipalityState);

    if (!config) {
      return [];
    }

    return [
      {
        id: `${config.state.toLowerCase()}-${asset.properties.infrastructurePointId}-${config.namePrefix.toLowerCase()}-glb`,
        name: `${config.namePrefix} - ${asset.properties.name}`,
        state: config.state,
        coordinates: asset.geometry.coordinates,
        modelUrl: config.modelUrl,
        scaleMultiplier: config.scaleMultiplier,
        translation: config.translation,
      },
    ];
  });
}

function registerRuntimeModels(
  map: mapboxgl.Map,
  models: MockedStateGlbModel[],
  fallbackModelUrl: string | undefined,
) {
  for (const model of models) {
    const modelId = getRuntimeModelId(model, fallbackModelUrl);

    if (map.hasModel(modelId)) {
      continue;
    }

    map.addModel(modelId, resolveModelUrl(fallbackModelUrl ?? model.modelUrl));
  }
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

function getModelScale(
  model: MockedStateGlbModel,
  scale: Asset3dModelOptions['scale'],
): [number, number, number] {
  const baseScale = scale ?? [1, 1, 1];
  const multiplier = model.scaleMultiplier ?? [1, 1, 1];

  return [baseScale[0] * multiplier[0], baseScale[1] * multiplier[1], baseScale[2] * multiplier[2]];
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
  offsetMeters: Asset3dModelOptions['offsetMeters'],
  scale: Asset3dModelOptions['scale'],
  fallbackModelUrl: string | undefined,
): ModelPointCollection {
  return {
    type: 'FeatureCollection',
    features: models.map((model) => ({
      type: 'Feature',
      properties: {
        id: model.id,
        name: model.name,
        state: model.state,
        'model-id': getRuntimeModelId(model, fallbackModelUrl),
        'model-scale': getModelScale(model, scale),
        'model-translation': model.translation ?? [0, 0, 4],
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
  registerRuntimeModels(map, models, options.modelUrl);

  map.addSource(ids.clipSourceId, {
    type: 'geojson',
    data: createClipSourceData(models, options.clipRadiusMeters ?? 120, options.offsetMeters),
  });

  map.addSource(ids.modelSourceId, {
    type: 'geojson',
    data: createModelSourceData(models, options.offsetMeters, options.scale, options.modelUrl),
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
    slot: 'top',
    source: ids.modelSourceId,
    minzoom: options.minZoom ?? 15,
    layout: {
      'model-id': ['get', 'model-id'],
      'model-allow-density-reduction': false,
    },
    paint: {
      'model-opacity': 1,
      'model-rotation': options.rotation ?? [0, 0, 35],
      'model-scale': ['array', 'number', 3, ['get', 'model-scale']],
      'model-translation': ['array', 'number', 3, ['get', 'model-translation']],
      'model-color-mix-intensity': 0,
      'model-cast-shadows': true,
      'model-receive-shadows': true,
      'model-ambient-occlusion-intensity': 0.85,
      'model-emissive-strength': 0.2,
      'model-roughness': 0.75,
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

export function upsertStateAsset3dModels(
  map: mapboxgl.Map,
  stateModels: MockedStateGlbModel[],
  options: Asset3dModelOptions,
) {
  removeStateAsset3dModels(map);

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
