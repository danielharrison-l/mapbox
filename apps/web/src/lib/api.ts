import type {
  CreateMeteorologyAssetRequest,
  MeteorologyAssetsGeoJsonResponse,
  MeteorologyAssetsPointCollection,
  Municipality,
} from '../types/geo';
import { isPointFeature, parseCoverageArea } from './geo';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export async function fetchMeteorologyAssets(
  signal: AbortSignal,
): Promise<MeteorologyAssetsPointCollection> {
  const response = await fetch(`${API_BASE_URL}/geo/meteorology-assets/geojson`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const data = (await response.json()) as MeteorologyAssetsGeoJsonResponse;

  return {
    type: 'FeatureCollection',
    features: data.features.filter(isPointFeature).map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        coverageArea: parseCoverageArea(feature.properties.coverageArea),
      },
    })),
  };
}

export async function fetchMunicipalities(signal: AbortSignal): Promise<Municipality[]> {
  const response = await fetch(`${API_BASE_URL}/geo/municipalities`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  return (await response.json()) as Municipality[];
}

export async function createMeteorologyAsset(
  payload: CreateMeteorologyAssetRequest,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/geo/meteorology-assets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
}
