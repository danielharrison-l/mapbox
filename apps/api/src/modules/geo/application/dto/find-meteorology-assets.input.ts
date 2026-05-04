import type { BrazilianState } from '../../domain/brazilian-state';
import type { MeteorologyAssetStatus } from '../../infrastructure/persistence/entities/meteorology-asset.entity';

export type FindMeteorologyAssetsInput = {
  state?: BrazilianState;
  status?: MeteorologyAssetStatus;
};
