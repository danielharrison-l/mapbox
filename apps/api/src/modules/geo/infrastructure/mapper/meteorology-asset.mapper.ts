import type { CreateInfrastructurePointInput } from '../../application/dto/create-infrastructure-point.input';
import type { CreateMeteorologyAssetInput } from '../../application/dto/create-meteorology-asset.input';
import { CreateMeteorologyAssetRequest } from '../../http/requests/create-meteorology-asset.request';
import { InfrastructurePointMapper } from './infrastructure-point.mapper';
import { MeteorologyAsset } from '../persistence/entities/meteorology-asset.entity';
import type { InfrastructurePoint } from '../persistence/entities/infrastructure-point.entity';

export class MeteorologyAssetMapper {
  public static toCreateInput(
    request: CreateMeteorologyAssetRequest,
  ): CreateMeteorologyAssetInput {
    return {
      name: request.name,
      description: request.description ?? null,
      municipalityId: request.municipalityId,
      geometry: request.geometry,
      coverageArea: request.coverageArea,
      status: request.status,
    };
  }

  public static toInfrastructurePointEntity(
    input: CreateMeteorologyAssetInput,
  ): InfrastructurePoint {
    const infrastructurePointInput: CreateInfrastructurePointInput = {
      name: input.name,
      description: input.description ?? null,
      municipalityId: input.municipalityId,
      geometry: input.geometry,
    };

    return InfrastructurePointMapper.toEntity(infrastructurePointInput);
  }

  public static toEntity(
    input: CreateMeteorologyAssetInput,
    infrastructurePoint: InfrastructurePoint,
  ): MeteorologyAsset {
    const meteorologyAsset = new MeteorologyAsset();

    meteorologyAsset.infrastructurePointId = infrastructurePoint.id;
    meteorologyAsset.infrastructurePoint = infrastructurePoint;
    meteorologyAsset.coverageArea = input.coverageArea;

    if (input.status) {
      meteorologyAsset.status = input.status;
    }

    return meteorologyAsset;
  }
}
