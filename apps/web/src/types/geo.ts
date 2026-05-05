export type MeteorologyAssetStatus = 'NOT_STARTED' | 'STARTED' | 'CONCLUDED';
export type AssetFilterValue = 'ALL';

export type AssetFilters = {
  state: string | AssetFilterValue;
  status: MeteorologyAssetStatus | AssetFilterValue;
};

export type Municipality = {
  id: number;
  name: string;
  state: string | null;
  population: number;
};

export type PointGeometry = {
  type: 'Point';
  coordinates: [number, number];
};

export type PolygonGeometry = {
  type: 'Polygon';
  coordinates: [Array<[number, number]>];
};

export type MeteorologyAssetGeoJsonProperties = {
  id: number;
  infrastructurePointId: number;
  name: string;
  description: string | null;
  municipalityId: number;
  municipalityName: string | null;
  municipalityState: string | null;
  status: MeteorologyAssetStatus;
  coverageArea: PolygonGeometry | null;
};

export type MeteorologyAssetPointFeature = {
  type: 'Feature';
  geometry: PointGeometry;
  properties: MeteorologyAssetGeoJsonProperties;
};

export type MeteorologyAssetApiFeature = {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: unknown;
  } | null;
  properties: MeteorologyAssetGeoJsonProperties;
};

export type MeteorologyAssetsGeoJsonResponse = {
  type: 'FeatureCollection';
  features: MeteorologyAssetApiFeature[];
};

export type MeteorologyAssetsPointCollection = {
  type: 'FeatureCollection';
  features: MeteorologyAssetPointFeature[];
};

export type AssetFormState = {
  name: string;
  description: string;
  municipalityId: string;
  status: MeteorologyAssetStatus;
};

export type CreateMeteorologyAssetRequest = {
  name: string;
  description: string | null;
  municipalityId: number;
  geometry: PointGeometry;
  coverageArea: PolygonGeometry;
  status: MeteorologyAssetStatus;
};

export type ReverseGeocodedLocation = {
  municipalityName: string | null;
  stateName: string | null;
  stateCode: string | null;
};

export type ModelPerformanceStatus = 'idle' | 'measuring' | 'complete' | 'failed';

export type ModelPerformance = {
  status: ModelPerformanceStatus;
  assetId: number | null;
  modelUrl: string;
  durationMs: number | null;
  frames: number | null;
  averageFps: number | null;
  maxFrameTimeMs: number | null;
  measuredAt: string | null;
  errorMessage: string | null;
};

export type ModelCalibration = {
  offsetEastMeters: number;
  offsetNorthMeters: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotationZ: number;
  clipRadiusMeters: number;
};
