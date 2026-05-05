import type {
  AssetFilters,
  CreateMeteorologyAssetRequest,
  MeteorologyAssetsGeoJsonResponse,
  MeteorologyAssetsPointCollection,
  Municipality,
  ReverseGeocodedLocation,
} from '../types/geo';
import { isPointFeature, parseCoverageArea } from './geo';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

type MapboxGeocodingFeatureContextItem = {
  name?: string;
  region_code?: string;
  region_code_full?: string;
};

type MapboxGeocodingFeature = {
  properties?: {
    feature_type?: string;
    name?: string;
    region_code?: string;
    region_code_full?: string;
    context?: {
      place?: MapboxGeocodingFeatureContextItem;
      region?: MapboxGeocodingFeatureContextItem;
    };
  };
};

type MapboxGeocodingResponse = {
  features?: MapboxGeocodingFeature[];
};

export async function fetchMeteorologyAssets(
  signal: AbortSignal,
  filters?: AssetFilters,
): Promise<MeteorologyAssetsPointCollection> {
  const url = new URL(`${API_BASE_URL}/geo/meteorology-assets/geojson`);

  if (filters?.state && filters.state !== 'ALL') {
    url.searchParams.set('state', filters.state);
  }

  if (filters?.status && filters.status !== 'ALL') {
    url.searchParams.set('status', filters.status);
  }

  const response = await fetch(url, {
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

export async function reverseGeocodeLocation(
  signal: AbortSignal,
  [longitude, latitude]: [number, number],
  accessToken: string,
): Promise<ReverseGeocodedLocation | null> {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/reverse');
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('country', 'br');
  url.searchParams.set('types', 'place,region');
  url.searchParams.set('language', 'pt');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Mapbox Geocoding returned ${response.status}`);
  }

  const data = (await response.json()) as MapboxGeocodingResponse;
  const features = data.features ?? [];
  const placeFeature = features.find((feature) => feature.properties?.feature_type === 'place');
  const regionFeature = features.find((feature) => feature.properties?.feature_type === 'region');
  const firstFeature = features[0];
  const placeContext = firstFeature?.properties?.context?.place;
  const regionContext = firstFeature?.properties?.context?.region;
  const municipalityName = placeFeature?.properties?.name ?? placeContext?.name ?? null;
  const stateName = regionFeature?.properties?.name ?? regionContext?.name ?? null;
  const stateCode =
    regionFeature?.properties?.region_code ??
    regionFeature?.properties?.region_code_full ??
    regionFeature?.properties?.context?.region?.region_code ??
    regionFeature?.properties?.context?.region?.region_code_full ??
    regionContext?.region_code ??
    regionContext?.region_code_full ??
    null;

  if (!municipalityName && !stateName && !stateCode) {
    return null;
  }

  return {
    municipalityName,
    stateName,
    stateCode,
  };
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
