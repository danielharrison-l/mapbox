import type { FindMeteorologyAssetsInput } from '../../../application/dto/find-meteorology-assets.input';
import type { MeteorologyAsset } from '../entities/meteorology-asset.entity';

export interface MeteorologyAssetRepository {
  save(entity: MeteorologyAsset): Promise<MeteorologyAsset>;
  findAll(filters?: FindMeteorologyAssetsInput): Promise<MeteorologyAsset[]>;
  findByInfrastructurePointId(infrastructurePointId: number): Promise<MeteorologyAsset | null>;
}
