import { Inject, Injectable } from '@nestjs/common';
import type { CreateMeteorologyAssetInput } from '../dto/create-meteorology-asset.input';
import { MeteorologyAssetMapper } from '../../infrastructure/mapper/meteorology-asset.mapper';
import type { InfrastructurePointRepository } from '../../infrastructure/persistence/repositories/infrastructure-point.repository';
import type { MeteorologyAssetRepository } from '../../infrastructure/persistence/repositories/meteorology-asset.repository';
import {
  INFRASTRUCTURE_POINT_REPOSITORY,
  METEOROLOGY_ASSET_REPOSITORY,
} from '../../infrastructure/persistence/repositories/providers/repositories.providers';
import type { MeteorologyAsset } from '../../infrastructure/persistence/entities/meteorology-asset.entity';

@Injectable()
export class CreateMeteorologyAssetUseCase {
  public constructor(
    @Inject(INFRASTRUCTURE_POINT_REPOSITORY)
    private readonly infrastructurePointRepository: InfrastructurePointRepository,
    @Inject(METEOROLOGY_ASSET_REPOSITORY)
    private readonly meteorologyAssetRepository: MeteorologyAssetRepository,
  ) {}

  public async execute(
    input: CreateMeteorologyAssetInput,
  ): Promise<MeteorologyAsset> {
    const infrastructurePoint = MeteorologyAssetMapper.toInfrastructurePointEntity(input);
    const savedInfrastructurePoint = await this.infrastructurePointRepository.save(
      infrastructurePoint,
    );

    const meteorologyAsset = MeteorologyAssetMapper.toEntity(
      input,
      savedInfrastructurePoint,
    );

    return this.meteorologyAssetRepository.save(meteorologyAsset);
  }
}
