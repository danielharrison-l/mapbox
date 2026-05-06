import type {
  AssetFilters,
  CoverageSocioeconomicData,
  CreateMeteorologyAssetRequest,
  IsochroneFeatureCollection,
  LocationSearchResult,
  MeteorologyAssetsGeoJsonResponse,
  MeteorologyAssetsPointCollection,
  Municipality,
  PolygonGeometry,
  ReverseGeocodedLocation,
} from '../types/geo';
import { isPointFeature, parseCoverageArea } from './geo';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  readonly body: string | null;
  readonly status: number;
  readonly url: string;

  constructor(response: Response, body: string | null) {
    super(`API returned ${response.status}`);
    this.name = 'ApiError';
    this.body = body;
    this.status = response.status;
    this.url = response.url;
  }
}

async function throwApiError(response: Response): Promise<never> {
  let body: string | null = null;

  try {
    body = await response.text();
  } catch {
    body = null;
  }

  throw new ApiError(response, body);
}

type MapboxGeocodingFeatureContextItem = {
  name?: string;
  region_code?: string;
  region_code_full?: string;
};

type MapboxGeocodingFeature = {
  geometry?: {
    coordinates?: unknown;
  };
  properties?: {
    feature_type?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
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

function readGeocodingFeatureCoordinates(feature: MapboxGeocodingFeature): [number, number] | null {
  const coordinates = feature.geometry?.coordinates;

  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    coordinates.some((coordinate) => typeof coordinate !== 'number')
  ) {
    return null;
  }

  return coordinates as [number, number];
}

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
    await throwApiError(response);
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
    await throwApiError(response);
  }

  return (await response.json()) as Municipality[];
}

export async function fetchCoverageSocioeconomicData(
  signal: AbortSignal,
  infrastructurePointId: number,
): Promise<CoverageSocioeconomicData> {
  const response = await fetch(
    `${API_BASE_URL}/geo/meteorology-assets/infrastructure-points/${infrastructurePointId}/coverage-socioeconomic-data`,
    {
      signal,
    },
  );

  if (!response.ok) {
    await throwApiError(response);
  }

  return (await response.json()) as CoverageSocioeconomicData;
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

export async function searchLocation(
  signal: AbortSignal,
  query: string,
  accessToken: string,
): Promise<LocationSearchResult | null> {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
  url.searchParams.set('q', query);
  url.searchParams.set('country', 'br');
  url.searchParams.set('language', 'pt');
  url.searchParams.set('limit', '1');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Mapbox Geocoding returned ${response.status}`);
  }

  const data = (await response.json()) as MapboxGeocodingResponse;
  const feature = data.features?.[0];
  const coordinates = feature ? readGeocodingFeatureCoordinates(feature) : null;

  if (!feature || !coordinates) {
    return null;
  }

  return {
    label:
      feature.properties?.full_address ??
      feature.properties?.place_formatted ??
      feature.properties?.name ??
      query,
    coordinates,
  };
}

export async function fetchIsochrone(
  signal: AbortSignal,
  [longitude, latitude]: [number, number],
  accessToken: string,
): Promise<IsochroneFeatureCollection> {
  const url = new URL(
    `https://api.mapbox.com/isochrone/v1/mapbox/driving/${longitude},${latitude}`,
  );
  url.searchParams.set('contours_minutes', '15,30');
  url.searchParams.set('polygons', 'true');
  url.searchParams.set('denoise', '1');
  url.searchParams.set('generalize', '120');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Mapbox alcance de carro retornou ${response.status}`);
  }

  return (await response.json()) as IsochroneFeatureCollection;
}

export async function updateMeteorologyAssetCoverage(
  infrastructurePointId: number,
  coverageArea: PolygonGeometry,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/geo/meteorology-assets/infrastructure-points/${infrastructurePointId}/coverage`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coverageArea }),
    },
  );

  if (!response.ok) {
    await throwApiError(response);
  }
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
    await throwApiError(response);
  }
}
