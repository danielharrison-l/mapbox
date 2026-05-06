import { Inject, Injectable } from '@nestjs/common';
import type { UpdateMeteorologyAssetCoverageInput } from '../dto/update-meteorology-asset-coverage.input';
import type { MeteorologyAsset } from '../../infrastructure/persistence/entities/meteorology-asset.entity';
import type { MeteorologyAssetRepository } from '../../infrastructure/persistence/repositories/meteorology-asset.repository';
import { METEOROLOGY_ASSET_REPOSITORY } from '../../infrastructure/persistence/repositories/providers/repositories.providers';

@Injectable()
export class UpdateMeteorologyAssetCoverageUseCase {
  public constructor(
    @Inject(METEOROLOGY_ASSET_REPOSITORY)
    private readonly meteorologyAssetRepository: MeteorologyAssetRepository,
  ) {}

  public async execute(
    input: UpdateMeteorologyAssetCoverageInput,
  ): Promise<MeteorologyAsset | null> {
    return this.meteorologyAssetRepository.updateCoverageArea(
      input.infrastructurePointId,
      input.coverageArea,
    );
  }
}
