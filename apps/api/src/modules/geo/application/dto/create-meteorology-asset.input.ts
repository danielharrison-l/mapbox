import type { MeteorologyAssetStatus } from '../../infrastructure/persistence/entities/meteorology-asset.entity';

export type CreateMeteorologyAssetInput = {
  name: string;
  description?: string | null;
  municipalityId: number;
  geometry: string;
  coverageArea: string;
  status?: MeteorologyAssetStatus;
};
