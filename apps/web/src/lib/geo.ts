import type {
  AssetFilters,
  MeteorologyAssetApiFeature,
  MeteorologyAssetPointFeature,
  MeteorologyAssetStatus,
  Municipality,
  PolygonGeometry,
  ReverseGeocodedLocation,
} from '../types/geo';

export function isPointFeature(
  feature: MeteorologyAssetApiFeature,
): feature is MeteorologyAssetPointFeature {
  return (
    feature.geometry?.type === 'Point' &&
    Array.isArray(feature.geometry.coordinates) &&
    feature.geometry.coordinates.length === 2 &&
    feature.geometry.coordinates.every((coordinate) => typeof coordinate === 'number')
  );
}

export function isPolygonGeometry(value: unknown): value is PolygonGeometry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const geometry = value as { type?: unknown; coordinates?: unknown };

  return (
    geometry.type === 'Polygon' &&
    Array.isArray(geometry.coordinates) &&
    geometry.coordinates.length > 0 &&
    geometry.coordinates.every(
      (ring) =>
        Array.isArray(ring) &&
        ring.length >= 4 &&
        ring.every(
          (position) =>
            Array.isArray(position) &&
            position.length === 2 &&
            position.every((coordinate) => typeof coordinate === 'number'),
        ),
    )
  );
}

export function parseCoverageArea(value: unknown): PolygonGeometry | null {
  if (isPolygonGeometry(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  try {
    const parsedValue = JSON.parse(value) as unknown;
    return isPolygonGeometry(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function createCoverageArea([lng, lat]: [number, number]): PolygonGeometry {
  const verticesCount = 8;
  const seed = Math.abs(Math.round(lng * 1000) + Math.round(lat * 1000));
  const angleOffset = ((seed % verticesCount) * Math.PI) / 18;
  const baseLngRadius = 0.22 + (seed % 5) * 0.024;
  const baseLatRadius = 0.18 + (seed % 4) * 0.02;
  const coordinates: Array<[number, number]> = [];

  for (let index = 0; index < verticesCount; index += 1) {
    const angle = angleOffset + (index / verticesCount) * Math.PI * 2;
    const radiusFactor = 0.74 + (((seed * 17 + index * 29) % 100) / 100) * 0.38;

    coordinates.push([
      Number((lng + Math.cos(angle) * baseLngRadius * radiusFactor).toFixed(6)),
      Number((lat + Math.sin(angle) * baseLatRadius * radiusFactor).toFixed(6)),
    ]);
  }

  coordinates.push(coordinates[0]);

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

type ReadPolygonOptions = {
  discardActiveDrawVertex?: boolean;
};

export function readFirstPolygonGeometry(
  value: unknown,
  options: ReadPolygonOptions = {},
): PolygonGeometry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const featureCollection = value as {
    features?: Array<{
      geometry?: unknown;
    }>;
  };

  const polygonFeature = featureCollection.features?.find((feature) =>
    isPolygonGeometry(feature.geometry),
  );

  return polygonFeature?.geometry && isPolygonGeometry(polygonFeature.geometry)
    ? closePolygonGeometry(polygonFeature.geometry, options)
    : null;
}

function closePolygonGeometry(
  polygon: PolygonGeometry,
  options: ReadPolygonOptions = {},
): PolygonGeometry {
  return {
    ...polygon,
    coordinates: polygon.coordinates.map((ring) => {
      const normalizedRing =
        options.discardActiveDrawVertex && ring.length > 4 ? discardActiveDrawVertex(ring) : ring;
      const firstPosition = normalizedRing[0];
      const lastPosition = normalizedRing.at(-1);

      if (!firstPosition || !lastPosition) {
        return normalizedRing;
      }

      if (firstPosition[0] === lastPosition[0] && firstPosition[1] === lastPosition[1]) {
        return normalizedRing;
      }

      return [...normalizedRing, firstPosition];
    }) as PolygonGeometry['coordinates'],
  };
}

function discardActiveDrawVertex(ring: Array<[number, number]>): Array<[number, number]> {
  const firstPosition = ring[0];
  const lastPosition = ring.at(-1);

  if (
    firstPosition &&
    lastPosition &&
    firstPosition[0] === lastPosition[0] &&
    firstPosition[1] === lastPosition[1]
  ) {
    return [...ring.slice(0, -2), firstPosition];
  }

  return ring.slice(0, -1);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Erro desconhecido';
}

export function getStatusLabel(status: MeteorologyAssetStatus): string {
  const labels: Record<MeteorologyAssetStatus, string> = {
    NOT_STARTED: 'Não iniciado',
    STARTED: 'Iniciado',
    CONCLUDED: 'Concluído',
  };

  return labels[status];
}

export function getStateOptions(municipalities: Municipality[]): string[] {
  return Array.from(
    new Set(
      municipalities
        .map((municipality) => municipality.state)
        .filter((state): state is string => Boolean(state)),
    ),
  ).sort((firstState, secondState) => firstState.localeCompare(secondState));
}

export function findMunicipalityFromGeocoding(
  location: ReverseGeocodedLocation,
  municipalities: Municipality[],
): Municipality | null {
  if (!location.municipalityName) {
    return null;
  }

  const normalizedName = normalizeText(location.municipalityName);
  const normalizedState = normalizeStateCode(location.stateCode);

  return (
    municipalities.find((municipality) => {
      const matchesName = normalizeText(municipality.name) === normalizedName;
      const matchesState = !normalizedState || municipality.state === normalizedState;

      return matchesName && matchesState;
    }) ?? null
  );
}

export function formatGeocodedLocation(location: ReverseGeocodedLocation): string {
  if (location.stateCode && location.municipalityName) {
    return `${location.stateCode} - ${location.municipalityName}`;
  }

  return location.stateCode ?? location.stateName ?? location.municipalityName ?? 'local informado';
}

function normalizeStateCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toUpperCase();

  if (/^[A-Z]{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const stateMatch = normalizedValue.match(/BR-([A-Z]{2})$/);
  return stateMatch?.[1] ?? null;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

export function assetMatchesFilters(
  asset: MeteorologyAssetPointFeature,
  filters: AssetFilters,
): boolean {
  const matchesState =
    filters.state === 'ALL' || asset.properties.municipalityState === filters.state;
  const matchesStatus = filters.status === 'ALL' || asset.properties.status === filters.status;

  return matchesState && matchesStatus;
}

export function getStatusPillClassName(status: MeteorologyAssetStatus): string {
  const classes: Record<MeteorologyAssetStatus, string> = {
    NOT_STARTED: 'bg-slate-200 text-slate-700',
    STARTED: 'bg-amber-100 text-amber-800',
    CONCLUDED: 'bg-green-100 text-green-800',
  };

  return `shrink-0 rounded-full px-2 py-1 text-[11px] font-extrabold leading-none ${classes[status]}`;
}
