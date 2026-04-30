import { CreateInfrastructurePointUseCase } from '../create-infrastructure-point.use-case';
import { CreateMeteorologyAssetUseCase } from '../create-meteorology-asset.use-case';
import { FindAllMeteorologyAssetsUseCase } from '../find-all-meteorology-assets.use-case';
import { FindAllMunicipalitiesUseCase } from '../find-all-municipalities.use-case';
import { FindMeteorologyAssetByInfrastructurePointIdUseCase } from '../find-meteorology-asset-by-infrastructure-point-id.use-case';

export const GEO_USE_CASE_PROVIDERS = [
  CreateInfrastructurePointUseCase,
  CreateMeteorologyAssetUseCase,
  FindAllMeteorologyAssetsUseCase,
  FindMeteorologyAssetByInfrastructurePointIdUseCase,
  FindAllMunicipalitiesUseCase,
];
