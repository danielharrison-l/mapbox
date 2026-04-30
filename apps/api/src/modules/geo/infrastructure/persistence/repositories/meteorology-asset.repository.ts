import type { MeteorologyAsset } from '../entities/meteorology-asset.entity';

export interface MeteorologyAssetRepository {
  save(entity: MeteorologyAsset): Promise<MeteorologyAsset>;
  findAll(): Promise<MeteorologyAsset[]>;
  findByInfrastructurePointId(infrastructurePointId: number): Promise<MeteorologyAsset | null>;
}
